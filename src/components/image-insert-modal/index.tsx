import React, { useState, useRef } from 'react'
import { Modal, Radio, Space, Upload, Message } from '@arco-design/web-react'
import { IconPlus } from '@arco-design/web-react/icon'
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

  const isAcceptFile = (file: File, accept: string | string[]) => {
    if (accept && file) {
      const accepts = Array.isArray(accept)
        ? accept
        : accept
            .split(',')
            .map((x) => x.trim())
            .filter((x) => x)
      const fileExtension = file.name.indexOf('.') > -1 ? file.name.split('.').pop() : ''
      return accepts.some((type) => {
        const text = type && type.toLowerCase()
        const fileType = (file.type || '').toLowerCase()
        if (text === fileType) {
          // 类似excel文件这种
          // 比如application/vnd.ms-excel和application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
          // 本身就带有.字符的，不能走下面的.jpg等文件扩展名判断处理
          // 所以优先对比input的accept类型和文件对象的type值
          return true
        }
        if (new RegExp('\\/\\*').test(text)) {
          // image/* 这种通配的形式处理
          const regExp = new RegExp('\\/.*$')
          return fileType.replace(regExp, '') === text.replace(regExp, '')
        }
        if (new RegExp('\\..*').test(text)) {
          // .jpg 等后缀名
          return text === `.${fileExtension && fileExtension.toLowerCase()}`
        }
        return false
      })
    }
    return !!file
  }

  const handleFileChange = (file: File): void => {
    // 检查文件大小是否超过3MB
    const maxSize = 3 * 1024 * 1024 // 3MB in bytes
    if (file.size > maxSize) {
      Message.info('文件大小不能超过3MB')
      return
    }

    // 检查文件类型
    if (file && (file.type === 'image/png' || file.type === 'image/jpeg' || file.type === 'image/jpg')) {
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          setSelectedImage(event.target.result as string)
        }
      }
      reader.readAsDataURL(file)
    } else {
      Message.info('请上传PNG或JPG格式的图片')
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
          {/* 将原来的选择图片按钮替换为 Upload 组件 */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <div className="w-full">
              <Upload
                className="bg-gray-50"
                drag
                accept="image/*"
                onDrop={(e) => {
                  const uploadFile = e.dataTransfer.files[0]
                  // 检查文件大小是否超过3MB
                  const maxSize = 3 * 1024 * 1024 // 3MB in bytes
                  if (uploadFile && uploadFile.size > maxSize) {
                    Message.info('文件大小不能超过3MB')
                    e.preventDefault()
                    return
                  }

                  if (!isAcceptFile(uploadFile, 'image/*')) {
                    Message.info('不接受的文件类型，请重新上传指定文件类型~')
                    e.preventDefault()
                  }
                }}
                tip="仅支持上传图片格式文件，文件大小不超过3MB"
                fileList={selectedImage ? [{ uid: '-1', name: 'selected-image.png', url: selectedImage }] : []}
                showUploadList={false}
                beforeUpload={(file) => {
                  handleFileChange(file)
                  return false // 阻止默认上传行为
                }}
              >
                <div className="arco-upload-drag">
                  <div className="arco-upload-drag-content">
                    {selectedImage ? (
                      <div className="flex flex-col items-center py-4">
                        <img src={selectedImage} alt="Preview" style={{ maxWidth: '100%', maxHeight: '200px' }} />
                        <div className="mt-2 flex items-center text-primary">
                          <IconPlus />
                          <span>更换图片</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center py-6">
                        <IconPlus style={{ fontSize: 24, marginBottom: 8 }} />
                        <p>点击或拖拽图片到此区域以上传（大小不超过3MB）</p>
                      </div>
                    )}
                  </div>
                </div>
              </Upload>
            </div>
          </div>

          {/* 原来的实现 */}
          {/* 
          <input
            type="file"
            ref={fileInputRef}
            accept=".png,.jpg,.jpeg"
            onChange={handleFileChange}
            className="hidden"
          />
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <Button onClick={() => fileInputRef.current?.click()} type="primary">
              选择图片
            </Button>
          </div>
          */}

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
