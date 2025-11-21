import { Slider, ColorPicker } from '@arco-design/web-react'
import { useStore } from '@/stores/canvasStore'

const PropertyPanel = () => {
  const { selectedIds, elements, updateElement } = useStore()

  // 只处理选中单个元素的情况
  if (selectedIds.length !== 1) return null
  const id = selectedIds[0]
  const element = elements[id]

  const handleChange = (key: string, val: any) => {
    updateElement(id, { [key]: val })
  }

  return (
    <div className="absolute right-4 top-4 w-60 rounded bg-white p-4 shadow-lg">
      <div className="mb-2">填充色</div>
      <ColorPicker value={element.fill} onChange={(val) => handleChange('fill', val)} className="w-full" />

      <div className="my-2">边框色</div>
      <ColorPicker value={element.stroke} onChange={(val) => handleChange('stroke', val)} className="w-full" />

      <div className="my-2">边框宽: {element.strokeWidth}</div>
      <Slider value={element.strokeWidth} max={20} onChange={(val) => handleChange('strokeWidth', val)} />

      <div className="my-2">透明度: {element.alpha}</div>
      <Slider value={element.alpha} min={0} max={1} step={0.1} onChange={(val) => handleChange('alpha', val)} />

      {element.type === 'rect' && (
        <>
          <div className="my-2">圆角: {element.radius}</div>
          <Slider value={element.radius} max={100} onChange={(val) => handleChange('radius', val)} />
        </>
      )}
    </div>
  )
}

export default PropertyPanel
