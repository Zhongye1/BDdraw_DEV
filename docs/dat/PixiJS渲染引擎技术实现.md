## 背景与设计目标

现代 Web 应用对于高性能 2D 图形渲染的需求日益增长，尤其在在线协作白板、设计工具等场景中，需要能够流畅地渲染大量图形元素并提供良好的交互体验。传统的 Canvas API 虽然提供了基础的绘图能力，但在处理复杂场景、大量元素以及高级交互时往往力不从心。为了解决这些问题，我们选用了 PixiJS v8 作为底层渲染引擎，结合 pixi-viewport 实现无限画布功能。

在技术选型过程中，我们重点考虑了渲染性能、开发效率以及生态系统的成熟度。PixiJS 基于 WebGL 构建，提供了硬件加速的图形渲染能力，能够充分发挥现代 GPU 的性能。与此同时，它也保留了对 Canvas 2D 上下文的回退支持，确保在不支持 WebGL 的环境中仍能正常运行。我们的设计目标是构建一个能够流畅渲染数千个元素、支持实时协作、提供丰富交互功能的高性能画布系统。

## 核心设计

系统采用模块化架构设计，将渲染逻辑、交互处理、状态管理等功能进行解耦。StageManager 作为核心管理类，负责协调各个模块的工作，统一管理 PixiJS Application 实例和 Viewport 视口。ElementRenderer 专门负责将应用层的元素数据转换为 PixiJS 对象并进行渲染，而 TransformerRenderer 则负责渲染选中元素的变换控制器。

数据流从应用状态层开始，通过 Zustand 状态管理库维护画布元素的状态。当状态发生变化时，StageManager 会监听到这些变化并触发相应的渲染更新。ElementRenderer 接收最新的元素数据，根据元素类型创建或更新对应的 PixiJS 对象，包括图形、文本和图像等。与此同时，TransformerRenderer 会根据选中状态渲染变换控制器，包括边框、控制手柄和旋转手柄等。

系统通过 pixi-viewport 库实现无限画布功能，支持平移、缩放等视口操作。Viewport 作为 PixiJS 场景图中的一个特殊容器，能够控制其子元素的显示区域和变换。用户交互事件首先由 Viewport 捕获，然后分发给相应的处理模块。StageManager 内部集成了交互处理逻辑，能够区分不同的交互模式，如选择、拖拽、缩放、绘制等，并执行相应的操作。

## 实现细节

StageManager 类是整个渲染系统的核心，它封装了 PixiJS Application 的初始化、Viewport 的配置以及各种渲染和交互逻辑。在构造函数中，首先初始化 PixiJS Application 实例，设置背景色、抗锯齿等渲染参数。紧接着创建 Viewport 实例并添加到应用舞台中，配置其支持鼠标中键拖拽、滚轮缩放和手势捏合等交互方式。

ElementRenderer 负责将应用层的 CanvasElement 对象转换为 PixiJS 显示对象。对于不同类型的元素，采用不同的渲染策略。矩形、圆形、三角形等基础图形元素通过 PIXI.Graphics 对象进行渲染，利用其丰富的绘图 API 绘制各种形状。文本元素使用 HTMLText 类进行渲染，支持 HTML 标签和复杂样式。图像元素则通过 PIXI.Sprite 对象进行渲染，支持纹理缓存和异步加载。

在处理图像元素时，系统实现了纹理缓存机制以提高渲染性能。当首次遇到某个图像 URL 时，将其添加到加载队列中，通过 PIXI.Assets.load 异步加载纹理资源。加载完成后，将纹理存储在缓存中并创建对应的 Sprite 对象。对于正在加载的图像，先渲染一个占位符图形，待纹理加载完成后再替换为真实图像。这种策略既保证了界面的即时响应，又避免了重复加载相同资源。

系统支持多种基础图形的渲染，包括矩形（rect）、圆角矩形（roundRect）、圆形（circle）、三角形（triangle）、菱形（diamond）、线条（line）、箭头（arrow）、铅笔工具绘制的自由线条（pencil）以及组（group）等元素类型。每种图形都具有背景色（fill）、边框宽度（strokeWidth）、边框颜色（stroke）和透明度（alpha）等属性。对于矩形元素，根据是否设置了圆角半径来决定使用 rect()还是 roundRect()方法进行绘制。圆角矩形通过 roundRect()方法实现，可以指定各个角的圆角半径。圆形元素使用 ellipse()方法绘制，通过设置椭圆的长轴和短轴相等来实现完美的圆形。三角形通过 poly()方法绘制，传入三个顶点坐标构成三角形。菱形同样使用 poly()方法，通过四个顶点坐标进行绘制。

在图形属性渲染方面，系统支持多种样式属性，包括背景色（fill）、边框宽度（strokeWidth）、边框颜色（stroke）和透明度（alpha）。背景色通过 fill()方法应用到图形内部，支持透明度设置。边框通过 stroke()方法绘制，可以设置线宽、颜色以及线帽和连接点样式。对于具有非零边框宽度的元素，系统会先调用 stroke()方法绘制边框，然后再调用 fill()方法填充背景，确保视觉层次正确。此外，系统还支持圆角矩形的圆角半径（radius）属性，以及元素的旋转变换（rotation）。

【代码片段】

```typescript
// 图形元素渲染示例
const g = graphic as PIXI.Graphics
g.clear()

// 解析样式属性
const strokeWidth = data.strokeWidth ?? 2
const strokeColor = new PIXI.Color(data.stroke)
const fillColor = new PIXI.Color(data.fill)
const alpha = data.alpha ?? 1

// 设置边框样式
if (strokeWidth > 0) {
  g.stroke({ width: strokeWidth, color: strokeColor, cap: 'round', join: 'round' })
}

// 根据元素类型绘制不同图形
if (data.type === 'rect') {
  // 矩形渲染，支持圆角
  if (data.radius && data.radius > 0) {
    g.roundRect(0, 0, data.width, data.height, data.radius)
  } else {
    g.rect(0, 0, data.width, data.height)
  }
  // 应用边框和填充
  if (strokeWidth > 0) {
    g.stroke({ width: strokeWidth, color: strokeColor, cap: 'round', join: 'round' })
  }
  g.fill({ color: fillColor, alpha })
} else if (data.type === 'circle') {
  // 圆形渲染
  g.ellipse(data.width / 2, data.height / 2, data.width / 2, data.height / 2)
  if (strokeWidth > 0) {
    g.stroke({ width: strokeWidth, color: strokeColor, cap: 'round', join: 'round' })
  }
  g.fill({ color: fillColor, alpha })
} else if (data.type === 'triangle') {
  // 三角形渲染
  g.poly([data.width / 2, 0, data.width, data.height, 0, data.height / 2])
  if (strokeWidth > 0) {
    g.stroke({ width: strokeWidth, color: strokeColor, cap: 'round', join: 'round' })
  }
  g.fill({ color: fillColor, alpha })
} else if (data.type === 'diamond') {
  // 菱形渲染
  g.poly([data.width / 2, 0, data.width, data.height / 2, data.width / 2, data.height, 0, data.height / 2])
  if (strokeWidth > 0) {
    g.stroke({ width: strokeWidth, color: strokeColor, cap: 'round', join: 'round' })
  }
  g.fill({ color: fillColor, alpha })
}
```

TransformerRenderer 负责渲染选中元素的变换控制器，包括包围盒、控制手柄和旋转手柄。对于单个元素和多个元素的选中情况，采用不同的渲染策略。直线和箭头等线性元素需要特殊的控制点渲染，直接在端点位置绘制控制手柄。而对于普通元素和多选情况，则计算包围盒并渲染完整的变换控制器。

在渲染变换控制器时，需要考虑元素的旋转状态。系统通过计算元素的包围盒中心和旋转角度，将控制手柄放置在正确的位置，并根据旋转角度调整光标样式。旋转手柄位于包围盒上方一定距离处，通过一条连线连接到包围盒，提供直观的旋转操作指示。

## 性能优化与难点攻克

在实现高性能渲染的过程中，我们遇到了多个技术挑战并采用了相应的优化策略。内存泄漏是一个关键问题，特别是在频繁创建和销毁显示对象时。为了解决这个问题，系统实现了完整的资源管理机制，确保每个创建的显示对象在不再需要时都能被正确销毁。在 ElementRenderer 中，维护了 spriteMap 来跟踪所有活动的显示对象，当元素从状态中移除时，会从容器中移除并销毁对应的显示对象。

图像渲染是另一个性能关键点。由于图像纹理通常占用较大内存，系统实现了纹理缓存和按需加载机制。通过 textureCache 映射表缓存已加载的纹理，在多个元素引用同一图像时共享纹理资源。同时，当图像元素被删除时，会检查是否还有其他元素引用该纹理，如果没有则及时销毁纹理以释放内存。

交互性能优化方面，系统采用了事件委托和精确的命中区域设计。控制手柄等交互元素使用透明的命中区域图形覆盖在可见图形之上，避免了复杂的像素级碰撞检测。此外，通过合理设置 eventMode 属性，减少了不必要的事件监听器数量。

渲染性能优化采用了多种策略。首先，通过合理组织场景图结构，将静态元素和动态元素分离到不同的容器中，减少不必要的重新渲染。其次，利用 PixiJS 的脏矩形渲染机制，只重绘发生变化的区域。最后，对于大量相似元素的场景，采用对象池技术复用显示对象，减少垃圾回收压力。

## 总结

基于 PixiJS v8 实现的渲染引擎为我们的应用提供了强大的 2D 图形渲染能力，通过合理的架构设计和性能优化，能够流畅处理复杂的画布场景。模块化的设计使得各部分职责清晰，便于维护和扩展。未来可以进一步探索 WebGL 2.0 特性、更高级的渲染优化技术以及与 WebAssembly 的结合，以持续提升渲染性能和功能丰富度。
