# Undo/Redo 功能设计文档

## 概述

BDdraw_DEV 项目中的 Undo/Redo 功能基于命令模式实现，通过状态快照机制来追踪和管理用户操作。该系统允许用户撤销和重做对画布内容的修改操作。

## 核心组件

### 1. UndoRedoManager (撤销/重做管理器)

位于 `src/lib/UndoRedoManager.ts`，是撤销/重做功能的核心管理类。

主要功能：
- 管理撤销栈和重做栈
- 执行、撤销和重做命令
- 提供锁定机制防止在连续操作中记录过多中间状态

关键方法：
- `executeCommand(command)`: 执行并记录命令
- `undo()`: 撤销上一个操作
- `redo()`: 重做上一个操作
- `lock()/unlock()`: 锁定/解锁管理器，防止记录新命令
- `isLocked()`: 检查管理器是否被锁定

### 2. SnapshotCommand (快照命令)

同样位于 `src/lib/UndoRedoManager.ts`，用于表示状态变化的命令类。

主要功能：
- 保存操作前后的完整状态快照
- 实现撤销和重做逻辑

关键方法：
- `undo()`: 恢复到操作前的状态
- `redo()`: 恢复到操作后的状态

### 3. 状态存储 (useStore)

位于 `src/stores/canvasStore.ts`，使用 Zustand 实现全局状态管理。

主要功能：
- 存储画布所有核心数据
- 拦截状态变更并创建快照命令
- 提供操作接口给 UI 组件

## 工作流程

### 1. 状态变更追踪

每当状态发生变更时，系统会：

1. 捕获变更前的状态快照
2. 执行状态变更
3. 捕获变更后的状态快照
4. 创建 SnapshotCommand 对象并传入前后状态
5. 将命令提交给 UndoRedoManager 执行和记录

### 2. 连续操作处理

对于绘制、拖拽、调整大小等连续操作：

1. 操作开始时调用 `undoRedoManager.lock()` 锁定管理器
2. 操作过程中不会记录中间状态变化
3. 操作结束时调用 `undoRedoManager.unlock()` 解锁管理器
4. 只有最终结果会被记录为一个完整的操作

### 3. 特殊操作过滤

以下操作不会被记录到撤销/重做栈中：

1. 工具切换操作：仅改变当前工具类型
2. 元素选中操作：仅改变选中元素列表

## 实现细节

### 状态快照

使用 `structuredClone()` 方法创建状态的深拷贝快照，确保前后状态的独立性。

### 命令执行

命令执行遵循以下流程：

```
用户操作 -> 调用 Store 方法 -> 拦截状态变更 -> 创建快照命令 -> 执行并记录命令
```

### 撤销/重做

撤销/重做操作流程：

```
用户触发撤销/重做 -> UndoRedoManager 弹出相应命令 -> 调用命令的 undo/redo 方法 -> 恢复状态
```

## 使用示例

### 添加元素

```typescript
const newElement = {
  id: nanoid(),
  type: 'rect',
  x: 100,
  y: 100,
  width: 50,
  height: 50,
  fill: '#ff0000',
  stroke: '#000000',
  strokeWidth: 2
};

useStore.getState().addElement(newElement);
```

### 更新元素

```typescript
useStore.getState().updateElement(elementId, {
  x: 150,
  y: 150
});
```

### 删除元素

```typescript
useStore.getState().removeElements([elementId]);
```

## 快捷键

- `Ctrl+Z`: 撤销
- `Ctrl+Y` 或 `Ctrl+Shift+Z`: 重做

## 注意事项

1. 连续操作（如拖拽）会自动锁定管理器以避免记录中间状态
2. 工具切换和元素选中操作不会被记录到历史中
3. 撤销/重做操作本身不会产生新的历史记录