import React, { useState } from 'react'
import { Modal, Button, Radio, Message } from '@arco-design/web-react'
import { useStageManager } from './StageManagerContext'
import { useStore } from '@/stores/canvasStore'
import { StageManager } from '@/pages/canvas/Pixi_stageManager'

interface ExportCanvasModalProps {
  visible: boolean
  onClose: () => void
  stageManager?: StageManager | null
}

const ExportCanvasModal: React.FC<ExportCanvasModalProps> = ({
  visible,
  onClose,
  stageManager: externalStageManager,
}) => {
  const contextStageManager = useStageManager()
  const stageManager = externalStageManager !== undefined ? externalStageManager : contextStageManager
  const { elements } = useStore()
  const [exportFormat, setExportFormat] = useState<'png' | 'svg'>('png')
  const [pngBackground, setPngBackground] = useState<'transparent' | 'white'>('transparent')
  const [loading, setLoading] = useState(false)

  const handleExport = async () => {
    if (!stageManager) {
      Message.error('无法导出画布：StageManager 未初始化')
      return
    }

    setLoading(true)

    try {
      if (exportFormat === 'png') {
        await exportAsPNG(stageManager, pngBackground)
      } else {
        await exportAsSVG()
      }
    } catch (error) {
      Message.error(`导出失败: ${(error as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  const exportAsPNG = async (stageManager: any, background: 'transparent' | 'white') => {
    // 使用 PixiJS 的 extract 插件来导出为 PNG
    const extract = stageManager.app.renderer.extract
    const canvas = await extract.canvas(stageManager.viewport)

    let finalCanvas = canvas
    // 如果选择了白色背景，则创建一个新的带白色背景的canvas
    if (background === 'white') {
      const newCanvas = document.createElement('canvas')
      newCanvas.width = canvas.width
      newCanvas.height = canvas.height

      const ctx = newCanvas.getContext('2d')
      if (ctx) {
        // 填充白色背景
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, newCanvas.width, newCanvas.height)
        // 在白色背景上绘制原始canvas
        ctx.drawImage(canvas, 0, 0)
        finalCanvas = newCanvas
      }
    }

    // 创建下载链接
    const link = document.createElement('a')
    link.download = `canvas-export-${new Date().getTime()}.png`
    link.href = finalCanvas.toDataURL('image/png')
    link.click()

    Message.success('PNG 导出成功')
  }

  const exportAsSVG = async () => {
    // 基于元素数据生成 SVG
    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">`

    // 遍历所有元素生成对应的 SVG 元素
    Object.values(elements).forEach((element) => {
      switch (element.type) {
        case 'rect':
          svgContent += `<rect x="${element.x}" y="${element.y}" width="${element.width}" height="${element.height}" fill="${element.fill}" stroke="${element.stroke}" stroke-width="${element.strokeWidth}" />`
          break

        case 'circle': {
          const cx = element.x + element.width / 2
          const cy = element.y + element.height / 2
          const r = Math.min(element.width, element.height) / 2
          svgContent += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${element.fill}" stroke="${element.stroke}" stroke-width="${element.strokeWidth}" />`
          break
        }

        case 'triangle': {
          const x1 = element.x + element.width / 2
          const y1 = element.y
          const x2 = element.x
          const y2 = element.y + element.height
          const x3 = element.x + element.width
          const y3 = element.y + element.height
          svgContent += `<polygon points="${x1},${y1} ${x2},${y2} ${x3},${y3}" fill="${element.fill}" stroke="${element.stroke}" stroke-width="${element.strokeWidth}" />`
          break
        }

        default:
          // 对于其他元素类型，绘制一个默认矩形
          svgContent += `<rect x="${element.x}" y="${element.y}" width="${element.width}" height="${element.height}" fill="${element.fill}" stroke="${element.stroke}" stroke-width="${element.strokeWidth}" />`
          break
      }
    })

    svgContent += '</svg>'

    // 创建 Blob 并下载
    const blob = new Blob([svgContent], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = `canvas-export-${new Date().getTime()}.svg`
    link.href = url
    link.click()

    // 清理 URL 对象
    setTimeout(() => URL.revokeObjectURL(url), 1000)

    Message.success('SVG 导出成功')
  }

  return (
    <Modal
      title="导出画布"
      visible={visible}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button key="export" type="primary" onClick={handleExport} loading={loading} disabled={!stageManager}>
          导出
        </Button>,
      ]}
    >
      <div className="py-4">
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-700">选择导出格式</label>
          <Radio.Group
            value={exportFormat}
            onChange={(value) => setExportFormat(value as 'png' | 'svg')}
            disabled={loading}
          >
            <Radio value="png">PNG 图像</Radio>
            {/*<Radio value="svg">SVG 矢量图</Radio>*/}
          </Radio.Group>
        </div>

        {exportFormat === 'png' && (
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">PNG 背景</label>
            <Radio.Group
              value={pngBackground}
              onChange={(value) => setPngBackground(value as 'transparent' | 'white')}
              disabled={loading}
            >
              <Radio value="transparent">透明背景</Radio>
              <Radio value="white">白色背景</Radio>
            </Radio.Group>
          </div>
        )}

        {!stageManager && <div className="mt-2 text-sm text-red-500">画布尚未准备好，无法导出</div>}

        {exportFormat === 'svg' && (
          <div className="mt-4 border-l-4 border-blue-400 bg-blue-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-blue-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  SVG 导出基于画布元素数据生成，支持矩形、圆形和三角形等基本图形。
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default ExportCanvasModal
