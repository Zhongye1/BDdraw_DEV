import { Helmet } from 'react-helmet-async'
import { Button, Card, Space, Typography, Divider, Tag } from '@arco-design/web-react'
import { IconApps, IconBulb, IconCode, IconThunderbolt, IconRight } from '@arco-design/web-react/icon'

const { Title, Paragraph } = Typography

export default function Home() {
  return (
    <>
      <Helmet>
        <title>BDdraw_DEV</title>
      </Helmet>

      {/* Hero Section */}
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 mt-8 text-center">
            <Title heading={1} className="mb-6 text-4xl font-bold text-gray-900 md:text-6xl">
              Arco Design Plugins
            </Title>
            <Paragraph className="mx-auto max-w-3xl text-xl text-gray-600">
              强大且灵活的 React UI 组件库，提供丰富的插件和工具，帮助您快速构建现代化的 Web 应用。
            </Paragraph>
          </div>

          {/* Features Grid */}
          <div className="mb-16 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            <Card className="rounded-xl transition-shadow hover:shadow-lg">
              <Space align="start" className="mb-4">
                <div className="rounded-full bg-blue-100 p-3">
                  <IconApps className="text-xl text-blue-600" />
                </div>
                <Title heading={4}>丰富的组件</Title>
              </Space>
              <Paragraph type="secondary">
                提供超过 60 个高质量组件，涵盖各种常见 UI 场景，满足您的多样化需求。
              </Paragraph>
            </Card>

            <Card className="rounded-xl transition-shadow hover:shadow-lg">
              <Space align="start" className="mb-4">
                <div className="rounded-full bg-green-100 p-3">
                  <IconBulb className="text-xl text-green-600" />
                </div>
                <Title heading={4}>灵活定制</Title>
              </Space>
              <Paragraph type="secondary">支持主题定制和样式覆盖，轻松适配您的品牌风格和设计规范。</Paragraph>
            </Card>

            <Card className="rounded-xl transition-shadow hover:shadow-lg">
              <Space align="start" className="mb-4">
                <div className="rounded-full bg-purple-100 p-3">
                  <IconCode className="text-xl text-purple-600" />
                </div>
                <Title heading={4}>开发者友好</Title>
              </Space>
              <Paragraph type="secondary">完善的 TypeScript 类型支持和详细的文档，提升开发效率和代码质量。</Paragraph>
            </Card>

            <Card className="rounded-xl transition-shadow hover:shadow-lg">
              <Space align="start" className="mb-4">
                <div className="rounded-full bg-orange-100 p-3">
                  <IconThunderbolt className="text-xl text-orange-600" />
                </div>
                <Title heading={4}>高性能</Title>
              </Space>
              <Paragraph type="secondary">采用虚拟滚动等优化技术，确保在大规模数据场景下的流畅体验。</Paragraph>
            </Card>
          </div>

          {/* Main Content */}
          <div className="mb-16 overflow-hidden rounded-2xl bg-white shadow-lg">
            <div className="p-8">
              <Title heading={2} className="mb-6">
                为什么选择 Arco Design？
              </Title>

              <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                <div>
                  <Title heading={3} className="mb-4 flex items-center">
                    <IconApps className="mr-2 text-blue-600" />
                    完整的解决方案
                  </Title>
                  <Paragraph className="mb-4">
                    Arco Design 不仅仅是一个 UI 组件库，它提供了一整套企业级中后台解决方案，
                    包括设计资源、技术文档、最佳实践等。
                  </Paragraph>
                  <ul className="list-disc space-y-2 pl-5">
                    <li>设计资源（Figma、Sketch）</li>
                    <li>完整的主题定制系统</li>
                    <li>国际化支持</li>
                    <li>无障碍访问支持</li>
                  </ul>
                </div>

                <div>
                  <Title heading={3} className="mb-4 flex items-center">
                    <IconThunderbolt className="mr-2 text-orange-600" />
                    强大的插件生态
                  </Title>
                  <Paragraph className="mb-4">通过丰富的插件扩展功能，满足各种定制化需求：</Paragraph>
                  <div className="mb-4 flex flex-wrap gap-2">
                    <Tag color="blue">Vite Plugin</Tag>
                    <Tag color="green">Webpack Plugin</Tag>
                    <Tag color="purple">ESLint Plugin</Tag>
                    <Tag color="orange">Figma Plugin</Tag>
                  </div>
                  <Paragraph>
                    这些插件可以帮助您在开发流程中更高效地使用 Arco Design， 从构建优化到设计协作，全面提升开发体验。
                  </Paragraph>
                </div>
              </div>

              <Divider className="my-8" />

              <div className="text-center">
                <Title heading={3} className="mb-6">
                  开始使用 Arco Design
                </Title>
                <Space size="large">
                  <Button type="primary" size="large">
                    查看文档
                  </Button>
                  <Button size="large">
                    GitHub 仓库 <IconRight />
                  </Button>
                </Space>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 p-12 text-center text-white">
            <Title heading={2} className="mb-4 text-white">
              准备好开始您的项目了吗？
            </Title>
            <Paragraph className="mx-auto mb-8 max-w-2xl text-xl text-blue-100">
              Arco Design 提供了完整的工具链和丰富的组件，帮助您快速构建美观、易用的现代 Web 应用。
            </Paragraph>
            <Button type="primary" size="large" className="bg-white text-blue-600 hover:bg-gray-100">
              立即开始
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
