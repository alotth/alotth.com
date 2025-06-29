# Funcionalidades de Seleção Múltipla

## Visão Geral

Implementamos funcionalidades de seleção múltipla tanto na **Notes View** quanto na **Mindmap View**, permitindo operações em lote nos nodes selecionados.

## Notes View

### Seleção Múltipla
- **Ctrl/Cmd + clique**: Adiciona/remove nota da seleção
- **Shift + clique**: Seleciona intervalo de notas da última selecionada até a atual
- **Clique simples**: Limpa seleção atual e seleciona apenas a nota clicada

### Indicadores Visuais
- Notas selecionadas ficam com borda destacada (ring-2 ring-primary)
- Contador de notas selecionadas aparece na área de informações
- Dicas de uso aparecem abaixo das informações de pesquisa

### Compatibilidade
- A seleção não interfere com o modo de edição das notas
- Cliques em botões e elementos interativos não ativam a seleção
- Área de seleção invisível sobreposta permite seleção fácil

## Mindmap View (ReactFlow)

### Seleção Múltipla
- **Control + clique**: Seleção múltipla individual (multiSelectionKeyCode)
- **Shift + arrastar**: Área de seleção para múltiplos nodes (selectionKeyCode)
- **onSelectionChange**: Callback que atualiza estado dos nodes selecionados

### Configuração ReactFlow
```tsx
<ReactFlow
  multiSelectionKeyCode="Control"
  selectionKeyCode="Shift"
  onSelectionChange={onSelectionChange}
  // ... outras props
>
```

## Toolbar de Operações em Lote

### Aparência
- Aparece fixo à esquerda da tela quando há nodes selecionados
- Design responsivo com z-index alto (z-50)
- Background com sombra e bordas arredondadas

### Funcionalidades

#### Ações Rápidas
- **Fixar**: Aplica pin em todos os nodes selecionados
- **Desafixar**: Remove pin de todos os nodes selecionados
- **Arquivar**: Arquiva todos os nodes selecionados
- **Desarquivar**: Desarquiva todos os nodes selecionados

#### Controles de Workflow
- **Prioridade**: Altera prioridade (baixa, média, alta) em lote
- **Status**: Altera status do workflow (todo, in_progress, done, blocked) em lote

#### Zona de Perigo
- **Excluir Selecionadas**: Remove permanentemente os nodes selecionados (com confirmação)

### Header
- Mostra quantidade de itens selecionados
- Botão X para limpar seleção

## Implementação Técnica

### Componentes Criados
1. **BulkOperationsToolbar**: Toolbar com operações em lote
2. Modificações em **NotesView**: Lógica de seleção múltipla
3. Modificações em **Editor**: Integração com ReactFlow

### Funções Auxiliares (lib/mindmap.ts)
```typescript
// Operações em lote
export async function bulkToggleNodesPinned(nodeIds: string[]): Promise<void>
export async function bulkToggleNodesArchived(nodeIds: string[]): Promise<void>
export async function bulkDeleteNodes(nodeIds: string[], projectId: string): Promise<void>
export async function bulkUpdateNodesPriority(nodeIds: string[], priority: Priority): Promise<void>
export async function bulkUpdateNodesWorkflow(nodeIds: string[], workflowStatus: WorkflowStatus): Promise<void>
```

### Estado Gerenciado
- **Notes View**: useState para selectedNotes (Set<string>), lastSelectedIndex
- **Mindmap View**: useState para selectedNodes e selectedEdges arrays

## UX/UI Melhorias

### Feedback Visual
- Ring border em itens selecionados
- Contador dinâmico de seleção
- Toast notifications para operações concluídas
- Loading states nos botões do toolbar

### Acessibilidade
- Instruções claras sobre como usar (Ctrl/Cmd + clique, Shift + clique)
- Confirmação para operações destrutivas
- Labels apropriados nos botões

### Performance
- Operações em lote via funções otimizadas
- Debounce em mudanças de state quando necessário
- Re-renders controlados via useCallback

## Como Usar

### Para Usuários
1. **Notes View**: Use Ctrl/Cmd + clique para selecionar múltiplas notas, depois use o toolbar que aparece à esquerda
2. **Mindmap View**: Use Control + clique ou Shift + arrastar para selecionar múltiplos nodes

### Para Desenvolvedores
- O BulkOperationsToolbar é reutilizável entre diferentes views
- As funções bulk do mindmap.ts podem ser extendidas para outras operações
- O sistema de seleção pode ser adaptado para outros tipos de elementos

## Próximos Passos Possíveis
- Atalhos de teclado para operações comuns (Del para excluir, Ctrl+A para selecionar tudo)
- Operações de copy/paste em lote
- Undo/redo para operações em lote
- Seleção por filtros (todos os pinned, todos com priority alta, etc.) 