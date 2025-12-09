import { Button, Space, Radio } from '@arco-design/web-react'
import { useStore } from '@/stores/canvasStore'
import { undoRedoManager } from '@/lib/UndoRedoManager'
import { UpdateElementPropertyCommand } from '@/lib/UpdateElementPropertyCommand'
import Title from '@arco-design/web-react/es/Typography/title'

// 预设填充色选项
const PRESET_FILL_COLORS = [
  { name: '白色', value: '#ffffff' },
  { name: '浅灰', value: '#f0f0f0' },
  { name: '红色', value: '#FCA5A5' },
  { name: '绿色', value: '#a6f9a6' },
  { name: '蓝色', value: '#8bc4ea' },
  { name: '黄色', value: '#fdfea9' },
]

// 预设边框色选项
const PRESET_STROKE_COLORS = [
  { name: '白色', value: '#ffffff' },
  { name: '深灰', value: '#000000' },
  { name: '红色', value: '#fe439e' },
  { name: '绿色', value: '#4fde1b' },
  { name: '蓝色', value: '#0000ff' },
  { name: '黄色', value: '#ffea80' },
]

// 预设边框宽度
const PRESET_STROKE_WIDTHS = [1, 5, 10, 20]

// 预设透明度
const PRESET_ALPHAS = [
  { name: '不透明', value: 1 },
  { name: '半透明', value: 0.3 },
  { name: '透明', value: 0 },
]

// 预设圆角
const PRESET_RADIUS = [0, 5, 10, 20, 50]

// 图片滤镜选项
const IMAGE_FILTERS = [
  { label: '无滤镜', value: 'none' },
  { label: '模糊', value: 'blur' },
  { label: '亮度增强', value: 'brightness' },
  { label: '灰度', value: 'grayscale' },
]

const ColorButton = ({ color, onClick, active }: { color: string; onClick: () => void; active: boolean }) => (
  <button
    onClick={onClick}
    className={`h-6 w-6 rounded border ${active ? 'border-2 border-gray-800' : 'border-gray-300'}`}
    style={{ backgroundColor: color }}
    title={color}
  />
)

const PropertyPanel = () => {
  const { selectedIds, elements, updateElement } = useStore()

  // 只处理选中单个元素的情况
  if (selectedIds.length !== 1) return null
  const id = selectedIds[0]
  const element = elements[id]

  // 如果元素不存在，不显示属性面板
  if (!element) return null
  // 文本类型元素不显示默认属性面板
  if (element.type === 'text') return null

  const handleChange = (key: string, val: any) => {
    // 记录更改前的属性值
    const oldValue = element[key as keyof typeof element]

    // 更新元素
    updateElement(id, { [key]: val })

    // 创建并执行更新命令以支持撤销/重做
    const updateCommand = new UpdateElementPropertyCommand(
      {
        id,
        property: key,
        oldValue,
        newValue: val,
      },
      `修改元素${key}`,
    )
    undoRedoManager.executeCommand(updateCommand)
  }

  // 定义哪些类型不需要填充色
  const noFillTypes = ['line', 'arrow', 'pencil', 'image']
  // 定义哪些类型不需要透明度
  const noAlphaTypes = ['line', 'arrow', 'pencil', 'image']
  // 定义哪些类型不需要边框色和边框宽度
  const noStrokeTypes = ['select', 'hand', 'eraser', 'image']

  return (
    <div className="absolute right-4 top-4 w-60 rounded bg-[var(--color-bg-2)] p-4 shadow-lg ">
      {element.type === 'image' && (
        <>
          <title>图片滤镜</title>
          <Radio.Group
            onChange={(value) => handleChange('filter', value)}
            value={element.filter || 'none'}
            className="mb-3"
          >
            <Space direction="vertical">
              {IMAGE_FILTERS.map((filter) => (
                <Radio key={filter.value} value={filter.value}>
                  {filter.label}
                </Radio>
              ))}
            </Space>
          </Radio.Group>
        </>
      )}

      {!noFillTypes.includes(element.type) && (
        <>
          <Title heading={6}>填充色</Title>
          <div className="mb-3 flex flex-wrap gap-1">
            {PRESET_FILL_COLORS.map((color) => (
              <ColorButton
                key={color.value}
                color={color.value}
                active={element.fill === color.value}
                onClick={() => handleChange('fill', color.value)}
              />
            ))}
          </div>
        </>
      )}

      {!noStrokeTypes.includes(element.type) && (
        <>
          <Title heading={6}>边框色</Title>
          <div className="mb-3 flex flex-wrap gap-1">
            {PRESET_STROKE_COLORS.map((color) => (
              <ColorButton
                key={color.value}
                color={color.value}
                active={element.stroke === color.value}
                onClick={() => handleChange('stroke', color.value)}
              />
            ))}
          </div>

          <Title heading={6}>边框宽度 </Title>
          <Space wrap size="small" className="mb-3">
            {PRESET_STROKE_WIDTHS.map((width) => (
              <Button
                key={width}
                size="small"
                type={element.strokeWidth === width ? 'primary' : 'default'}
                onClick={() => handleChange('strokeWidth', width)}
              >
                {width}px
              </Button>
            ))}
          </Space>
        </>
      )}

      {!noAlphaTypes.includes(element.type) && (
        <>
          <Title heading={6}>透明度</Title>
          <Space wrap size="small" className="mb-3">
            {PRESET_ALPHAS.map((alpha) => (
              <Button
                key={alpha.value}
                size="small"
                type={element.alpha === alpha.value ? 'primary' : 'default'}
                onClick={() => handleChange('alpha', alpha.value)}
              >
                {alpha.name}
              </Button>
            ))}
          </Space>
        </>
      )}

      {element.type === 'rect' && (
        <>
          <Title heading={6}>圆角</Title>
          <Space wrap size="small">
            {PRESET_RADIUS.map((radius) => (
              <Button
                key={radius}
                size="small"
                type={element.radius === radius ? 'primary' : 'default'}
                onClick={() => handleChange('radius', radius)}
              >
                {radius}px
              </Button>
            ))}
          </Space>
        </>
      )}
    </div>
  )
}

export default PropertyPanel
