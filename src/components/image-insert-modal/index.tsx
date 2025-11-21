import React, { useState, useRef } from 'react'
import { Modal, Button, Radio, Space } from '@arco-design/web-react'
import { useStore } from '@/stores/canvasStore'

interface ImageInsertModalProps {
  visible: boolean
  onClose: () => void
}

const ImageInsertModal: React.FC<ImageInsertModalProps> = ({ visible, onClose }) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [filter, setFilter] = useState<'none' | 'blur' | 'brightness' | 'grayscale'>('none')
  const { addElement, setSelected, setTool } = useStore()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && (file.type === 'image/png' || file.type === 'image/jpeg')) {
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          setSelectedImage(event.target.result as string)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handleInsert = () => {
    if (selectedImage) {
      const newId = `img_${Date.now()}`
      addElement({
        id: newId,
        type: 'image',
        x: 100,
        y: 100,
        width: 200,
        height: 150,
        fill: '',
        stroke: '',
        strokeWidth: 0,
        imageUrl: selectedImage,
        filter: filter,
      })

      setSelected([newId])
      setTool('select')
      onClose()

      // 重置状态
      setSelectedImage(null)
      setFilter('none')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleClose = () => {
    onClose()
    setSelectedImage(null)
    setFilter('none')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <Modal
      title="插入图片"
      visible={visible}
      onOk={handleInsert}
      onCancel={handleClose}
      okText="插入"
      cancelText="取消"
      okButtonProps={{ disabled: !selectedImage }}
    >
      <div className="flex flex-col gap-4">
        <div>
          <input
            type="file"
            ref={fileInputRef}
            accept=".png,.jpg,.jpeg"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button onClick={() => fileInputRef.current?.click()} type="primary" style={{ marginBottom: '16px' }}>
            选择图片
          </Button>

          {selectedImage && (
            <div className="mt-4">
              <div className="mb-2 text-sm">预览:</div>
              <img src={selectedImage} alt="Preview" style={{ maxWidth: '100%', maxHeight: '200px' }} />
            </div>
          )}
        </div>

        {selectedImage && (
          <div>
            <div className="mb-2 text-sm">滤镜效果:</div>
            <Radio.Group onChange={(value) => setFilter(value)} value={filter}>
              <Space direction="vertical">
                <Radio value="none">无滤镜</Radio>
                <Radio value="blur">模糊</Radio>
                <Radio value="brightness">亮度增强</Radio>
                <Radio value="grayscale">灰度</Radio>
              </Space>
            </Radio.Group>

            <div className="mt-4">
              <div className="mb-2 text-sm">滤镜预览:</div>
              <div className="flex gap-2">
                <div className="flex flex-col items-center">
                  <img
                    src={selectedImage}
                    alt="No filter"
                    style={{ width: '80px', height: '60px', objectFit: 'cover' }}
                  />
                  <span className="mt-1 text-xs">无滤镜</span>
                </div>

                <div className="flex flex-col items-center">
                  <img
                    src={selectedImage}
                    alt="Blur"
                    style={{ width: '80px', height: '60px', objectFit: 'cover', filter: 'blur(2px)' }}
                  />
                  <span className="mt-1 text-xs">模糊</span>
                </div>

                <div className="flex flex-col items-center">
                  <img
                    src={selectedImage}
                    alt="Brightness"
                    style={{ width: '80px', height: '60px', objectFit: 'cover', filter: 'brightness(1.5)' }}
                  />
                  <span className="mt-1 text-xs">亮度</span>
                </div>

                <div className="flex flex-col items-center">
                  <img
                    src={selectedImage}
                    alt="Grayscale"
                    style={{ width: '80px', height: '60px', objectFit: 'cover', filter: 'grayscale(100%)' }}
                  />
                  <span className="mt-1 text-xs">灰度</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default ImageInsertModal
