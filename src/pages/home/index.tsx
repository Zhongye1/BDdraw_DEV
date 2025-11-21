import { Helmet } from 'react-helmet-async'
import { Button, Card, Typography, Divider, Tag } from '@arco-design/web-react'

import { useNavigate } from 'react-router-dom'

const { Title, Paragraph } = Typography

export default function Home() {
  const navigate = useNavigate()

  const handleStartDrawing = () => {
    navigate('/canvas')
  }

  return (
    <>
      <Helmet>
        <title>BDdraw_DEV - 项目任务看板</title>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 overflow-hidden rounded-2xl bg-white shadow-lg">
            <div className="p-6">
              {/* Project Requirements */}
              <div className="mb-8">
                <Title heading={3} className="mb-4 border-b pb-2 text-xl font-bold text-gray-800">
                  课题要求
                </Title>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <Title heading={4} className="mb-3 text-lg font-semibold">
                      技术限制
                    </Title>
                    <ul className="ml-6 list-disc space-y-2">
                      <li>禁止使用 react-flow、tldraw、konva 等开源图形库</li>
                      <li>允许使用基础渲染库（pixi）</li>
                      <li>局部功能使用三方库可接受</li>
                      <li>主要业务逻辑需自行实现</li>
                      <li>允许使用 Cursor/Trae 等 AI 编辑器</li>
                    </ul>
                  </div>

                  <div>
                    <Title heading={4} className="mb-3 text-lg font-semibold">
                      竞品参考
                    </Title>
                    <div className="ml-6">
                      <Tag color="blue" className="mb-2 mr-2">
                        Figma
                      </Tag>
                      <Tag color="green" className="mb-2 mr-2">
                        Canva
                      </Tag>
                      <Tag color="purple" className="mb-2 mr-2">
                        Excalidraw
                      </Tag>
                      <Tag color="orange" className="mb-2 mr-2">
                        ProcessOn
                      </Tag>
                      <Tag color="red" className="mb-2 mr-2">
                        即梦画布
                      </Tag>
                      <Tag color="cyan" className="mb-2 mr-2">
                        飞书 Slide
                      </Tag>
                    </div>
                  </div>
                </div>
              </div>

              <Divider className="my-8" />

              {/* Project Schedule */}
              <div className="mb-8">
                <Title heading={3} className="mb-4 border-b pb-2 text-xl font-bold text-gray-800">
                  项目节奏
                </Title>

                <ol className="ml-6 list-decimal space-y-3">
                  <li>明确 MVP 范围与技术选型（渲染层 DOM/Canvas + 框架 Vue/React）</li>
                  <li>完成人员分工、项目框架搭建、确定草稿数据结构、最小画布可运行的 Demo</li>
                  <li>完成基础渲染、视口缩放/拖拽、选区（点击/框选）、浮动工具栏的属性设置</li>
                  <li>文本编辑、图层删除/拖拽/缩放；持久化（刷新后恢复）</li>
                  <li>可选功能：如撤销/重做、旋转、组合或协同</li>
                  <li>作业完成之后，交付代码仓库（可以是 Github 地址）、演示视频、项目说明文档三部分</li>
                </ol>
              </div>

              <Divider className="my-8" />

              {/* Task Breakdown */}
              <div className="mb-8">
                <Title heading={3} className="mb-4 border-b pb-2 text-xl font-bold text-gray-800">
                  任务拆解
                </Title>

                <div className="space-y-6">
                  <Card className="border-l-4 border-red-500">
                    <Title heading={4} className="mb-3 text-lg font-semibold">
                      【P0】基础渲染
                    </Title>
                    <ul className="ml-6 list-disc space-y-2">
                      <li>支持图形渲染，需要支持至少 3 种不同图形（矩形、圆角矩形、圆形、三角形等）</li>
                      <li>
                        支持以下图形属性：背景色（background）、边框宽度（border-width）、边框颜色（border-color）
                      </li>
                      <li>支持图片渲染，需要支持 png、jpeg 格式，支持设置三种简单滤镜</li>
                      <li>
                        支持富文本文字渲染，需要支持以下文本属性：
                        字体（font-family）、字号（font-size）、颜色（color）、背景色（background）、
                        BIUS（加粗、斜体、下划线、删除线）
                      </li>
                    </ul>
                  </Card>

                  <Card className="border-l-4 border-yellow-500">
                    <Title heading={4} className="mb-3 text-lg font-semibold">
                      【P0】画布交互
                    </Title>
                    <ul className="ml-6 list-disc space-y-2">
                      <li>支持无限画布的缩放、滚动、拖拽</li>
                      <li>【挑战 ⭐️⭐️】支持无限画布滚动条</li>
                      <li>【挑战 ⭐️⭐️⭐️】支持无限画布的 minimap 功能</li>
                      <li>支持选区功能：点击选中单个元素、框选选中多个元素</li>
                      <li>支持数据持久化，每次操作后自动保存数据，刷新页面数据仍然存在</li>
                      <li>快捷键复制选中元素，粘贴后刷新页面还存在</li>
                      <li>【挑战 ⭐️⭐️⭐️】支持辅助线功能</li>
                    </ul>
                  </Card>

                  <Card className="border-l-4 border-blue-500">
                    <Title heading={4} className="mb-3 text-lg font-semibold">
                      【P0】调参工具栏
                    </Title>
                    <ul className="ml-6 list-disc space-y-2">
                      <li>
                        浮动工具栏：
                        <ul className="list-circle ml-6 mt-1">
                          <li>当选中文本元素时出现在上方，支持设置不同文本属性</li>
                          <li>当选中图形元素时出现在上方，支持设置不同图形属性</li>
                          <li>当选中图片元素时出现在上方，支持设置不同图片属性</li>
                        </ul>
                      </li>
                      <li>【挑战 ⭐️⭐️】选中文本元素的部分文字时也能够出现，支持设置局部文本的文本属性</li>
                    </ul>
                  </Card>

                  <Card className="border-l-4 border-green-500">
                    <Title heading={4} className="mb-3 text-lg font-semibold">
                      【P0】元素编辑
                    </Title>
                    <ul className="ml-6 list-disc space-y-2">
                      <li>支持双击文本进入编辑，可以输入/删除文本内容</li>
                      <li>支持对选中元素（单个或多个）删除</li>
                      <li>支持对选中元素（单个或多个）拖拽</li>
                      <li>支持对选中元素（单个或多个）缩放</li>
                      <li>【挑战 ⭐️】支持对选中元素（单个或多个）旋转</li>
                      <li>【挑战 ⭐️⭐️】支持对多个元素进行组合操作，组合可以嵌套</li>
                      <li>【挑战 ⭐️⭐️⭐️】支持对多个元素进行打组、解组</li>
                    </ul>
                  </Card>

                  <Card className="border-l-4 border-purple-500">
                    <Title heading={4} className="mb-3 text-lg font-semibold">
                      【P0】性能优化
                    </Title>
                    <ul className="ml-6 list-disc space-y-2">
                      <li>画布存在 100 个元素，打开页面到渲染完成 {'<'} 3s</li>
                      <li>【挑战 ⭐️⭐️】同时操作 100 个元素，FPS 50+</li>
                    </ul>
                  </Card>

                  <Card className="border-l-4 border-orange-500">
                    <Title heading={4} className="mb-3 text-lg font-semibold">
                      【P1】协同
                    </Title>
                    <ul className="ml-6 list-disc space-y-2">
                      <li>【挑战 ⭐️⭐️⭐️】支持 undo & redo 操作</li>
                      <li>【挑战 ⭐️⭐️⭐️⭐️⭐️】支持协同编辑，多人打开同一个画布可以协同编辑</li>
                      <li>【挑战 ⭐️⭐️⭐️⭐️⭐️】支持离线编辑，断网后仍然可以对画布编辑，恢复网络后自动提交数据</li>
                    </ul>
                  </Card>
                </div>
              </div>

              <Divider className="my-8" />

              {/* FAQ */}
              <div className="mb-8">
                <Title heading={3} className="mb-4 border-b pb-2 text-xl font-bold text-gray-800">
                  杂项说明
                </Title>
              </div>

              <div className="text-center">
                <Button type="primary" size="large" onClick={handleStartDrawing}>
                  打开画布应用
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
