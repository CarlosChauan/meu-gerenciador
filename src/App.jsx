import { useEffect, useRef, useState } from 'react'
import './App.css'

const TASKS_STORAGE_KEY = 'tmj-rafaelkz-tasks'
const TASK_PRIORITIES = ['low', 'medium', 'high']

function getTaskPriority(priority) {
  return TASK_PRIORITIES.includes(priority) ? priority : 'medium'
}

function getPriorityLabel(priority) {
  if (priority === 'low') return 'Baixa'
  if (priority === 'high') return 'Alta'
  return 'Média'
}

function normalizeSearchText(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
}

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function isValidDateKey(dateKey) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return false

  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(0)
  date.setFullYear(year, month - 1, day)

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  )
}

function formatDueDate(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number)

  return new Date(year, month - 1, day).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function loadSavedTasks() {
  try {
    const savedTasks = window.localStorage.getItem(TASKS_STORAGE_KEY)

    if (savedTasks === null) {
      return []
    }

    const parsedTasks = JSON.parse(savedTasks)

    if (!Array.isArray(parsedTasks)) {
      console.error('Os dados salvos das tarefas não estão em um formato válido.')
      return []
    }

    return parsedTasks.filter(
      (task) =>
        task !== null &&
        typeof task === 'object' &&
        (typeof task.id === 'number' || typeof task.id === 'string') &&
        typeof task.title === 'string' &&
        typeof task.completed === 'boolean',
    ).map((task) => ({
      ...task,
      dueDate: isValidDateKey(task.dueDate) ? task.dueDate : '',
      priority: getTaskPriority(task.priority),
    }))
  } catch (error) {
    console.error('Não foi possível carregar as tarefas salvas.', error)
    return []
  }
}

function App() {
  const [tasks, setTasks] = useState(loadSavedTasks)
  const [hasChanges, setHasChanges] = useState(false)
  const [taskText, setTaskText] = useState('')
  const [taskDueDate, setTaskDueDate] = useState('')
  const [taskPriority, setTaskPriority] = useState('medium')
  const [activeFilter, setActiveFilter] = useState('all')
  const [searchText, setSearchText] = useState('')
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [editingText, setEditingText] = useState('')
  const [editingDueDate, setEditingDueDate] = useState('')
  const [editingPriority, setEditingPriority] = useState('medium')
  const [today, setToday] = useState(getLocalDateKey)
  const nextTaskId = useRef(
    tasks.reduce(
      (nextId, task) =>
        Number.isSafeInteger(task.id) ? Math.max(nextId, task.id + 1) : nextId,
      0,
    ),
  )

  const pendingCount = tasks.filter((task) => !task.completed).length
  const completedCount = tasks.length - pendingCount
  const completionPercentage =
    tasks.length === 0 ? 0 : Math.round((completedCount / tasks.length) * 100)
  const normalizedSearchText = normalizeSearchText(searchText.trim())
  const visibleTasks = tasks.filter((task) => {
    const matchesFilter =
      activeFilter === 'pending'
        ? !task.completed
        : activeFilter === 'completed'
          ? task.completed
          : true
    const matchesSearch = normalizeSearchText(task.title).includes(
      normalizedSearchText,
    )

    return matchesFilter && matchesSearch
  })

  useEffect(() => {
    if (!hasChanges) return

    try {
      window.localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks))
    } catch (error) {
      console.error('Não foi possível salvar as tarefas.', error)
    }
  }, [hasChanges, tasks])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setToday(getLocalDateKey())
    }, 60_000)

    return () => window.clearInterval(timer)
  }, [])

  function addTask(event) {
    event.preventDefault()
    const title = taskText.trim()

    if (!title) return

    setTasks((currentTasks) => [
      ...currentTasks,
      {
        id: nextTaskId.current++,
        title,
        completed: false,
        dueDate: taskDueDate,
        priority: getTaskPriority(taskPriority),
      },
    ])
    setHasChanges(true)
    setTaskText('')
    setTaskDueDate('')
    setTaskPriority('medium')
  }

  function toggleTask(taskId) {
    setHasChanges(true)
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task,
      ),
    )
  }

  function deleteTask(taskId) {
    setHasChanges(true)
    setTasks((currentTasks) =>
      currentTasks.filter((task) => task.id !== taskId),
    )
    if (editingTaskId === taskId) {
      cancelEditing()
    }
  }

  function startEditing(task) {
    setEditingTaskId(task.id)
    setEditingText(task.title)
    setEditingDueDate(task.dueDate || '')
    setEditingPriority(getTaskPriority(task.priority))
  }

  function cancelEditing() {
    setEditingTaskId(null)
    setEditingText('')
    setEditingDueDate('')
    setEditingPriority('medium')
  }

  function saveTask(event, taskId) {
    event.preventDefault()
    const title = editingText.trim()

    if (!title) return

    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              title,
              dueDate: editingDueDate,
              priority: getTaskPriority(editingPriority),
            }
          : task,
      ),
    )
    setHasChanges(true)
    cancelEditing()
  }

  return (
    <main className="app-shell">
      <section className="task-panel" aria-labelledby="page-title">
        <header className="page-header">
          <div className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="m5 12.5 4.5 4.5L19 7"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="eyebrow">SEU ESPAÇO DE PRODUTIVIDADE</span>
          <h1 id="page-title">TMJ Rafaelkz</h1>
          <p className="welcome-message">
            Um passo de cada vez. Você consegue!
          </p>
        </header>

        <form className="task-form" onSubmit={addTask}>
          <label className="sr-only" htmlFor="new-task">
            Digite uma nova tarefa
          </label>
          <input
            id="new-task"
            type="text"
            value={taskText}
            onChange={(event) => setTaskText(event.target.value)}
            placeholder="O que você precisa fazer?"
            autoComplete="off"
          />
          <label className="sr-only" htmlFor="new-task-due-date">
            Data de vencimento (opcional)
          </label>
          <input
            id="new-task-due-date"
            className="due-date-input"
            type="date"
            value={taskDueDate}
            onChange={(event) => setTaskDueDate(event.target.value)}
            aria-label="Data de vencimento (opcional)"
          />
          <label className="sr-only" htmlFor="new-task-priority">
            Prioridade da tarefa
          </label>
          <select
            id="new-task-priority"
            className="priority-select"
            value={taskPriority}
            onChange={(event) => setTaskPriority(event.target.value)}
            aria-label="Prioridade da tarefa"
          >
            <option value="low">Prioridade baixa</option>
            <option value="medium">Prioridade média</option>
            <option value="high">Prioridade alta</option>
          </select>
          <button type="submit" className="add-button">
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M10 4v12M4 10h12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            Adicionar
          </button>
        </form>

        <section className="productivity-summary" aria-labelledby="summary-title">
          <h2 id="summary-title">Resumo da produtividade</h2>
          <dl className="summary-stats">
            <div className="summary-card">
              <dt>Total de tarefas</dt>
              <dd>{tasks.length}</dd>
            </div>
            <div className="summary-card">
              <dt>Concluídas</dt>
              <dd>{completedCount}</dd>
            </div>
            <div className="summary-card">
              <dt>Pendentes</dt>
              <dd>{pendingCount}</dd>
            </div>
            <div className="summary-card">
              <dt>Conclusão</dt>
              <dd>{completionPercentage}%</dd>
            </div>
          </dl>
          <div className="summary-progress">
            <div
              className="progress-track"
              role="progressbar"
              aria-label="Porcentagem de tarefas concluídas"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow={completionPercentage}
            >
              <span
                className="progress-fill"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        </section>

        <div className="list-heading">
          <h2>Suas tarefas</h2>
          <span className="pending-count" aria-live="polite">
            {pendingCount} {pendingCount === 1 ? 'pendente' : 'pendentes'}
          </span>
        </div>

        <label className="sr-only" htmlFor="task-search">
          Buscar tarefas pelo nome
        </label>
        <input
          id="task-search"
          className="task-search"
          type="search"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          placeholder="Buscar tarefas..."
          autoComplete="off"
        />

        <div className="task-filters" role="group" aria-label="Filtrar tarefas">
          <button
            type="button"
            className={`filter-button${activeFilter === 'all' ? ' is-active' : ''}`}
            aria-pressed={activeFilter === 'all'}
            onClick={() => setActiveFilter('all')}
          >
            Todas
          </button>
          <button
            type="button"
            className={`filter-button${activeFilter === 'pending' ? ' is-active' : ''}`}
            aria-pressed={activeFilter === 'pending'}
            onClick={() => setActiveFilter('pending')}
          >
            Pendentes
          </button>
          <button
            type="button"
            className={`filter-button${activeFilter === 'completed' ? ' is-active' : ''}`}
            aria-pressed={activeFilter === 'completed'}
            onClick={() => setActiveFilter('completed')}
          >
            Concluídas
          </button>
        </div>

        {tasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon" aria-hidden="true">
              <svg viewBox="0 0 32 32" fill="none">
                <path
                  d="M10 8.5h12M10 14h12M10 19.5h7M7 4.5h18a2 2 0 0 1 2 2v19a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-19a2 2 0 0 1 2-2Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p className="empty-title">Tudo começa com uma tarefa</p>
            <p className="empty-description">
              Adicione uma tarefa acima para organizar seu dia.
            </p>
          </div>
        ) : visibleTasks.length === 0 ? (
          <div className="empty-state">
            <p className="empty-title">
              {normalizedSearchText
                ? 'Nenhuma tarefa encontrada'
                : 'Nenhuma tarefa nesta lista'}
            </p>
            <p className="empty-description">
              {normalizedSearchText
                ? 'Tente buscar por outro nome ou ajuste o filtro selecionado.'
                : 'Tente outro filtro ou atualize o status de uma tarefa.'}
            </p>
          </div>
        ) : (
          <ul className="task-list">
            {visibleTasks.map((task) => {
              const isOverdue =
                Boolean(task.dueDate) &&
                task.dueDate < today &&
                !task.completed

              return (
              <li
                className={`task-item${task.completed ? ' is-completed' : ''}${isOverdue ? ' is-overdue' : ''}`}
                key={task.id}
              >
                {editingTaskId === task.id ? (
                  <form
                    className="edit-form"
                    onSubmit={(event) => saveTask(event, task.id)}
                  >
                    <label className="sr-only" htmlFor={`edit-task-${task.id}`}>
                      Editar tarefa
                    </label>
                    <input
                      id={`edit-task-${task.id}`}
                      className="edit-input"
                      type="text"
                      value={editingText}
                      onChange={(event) => setEditingText(event.target.value)}
                      autoFocus
                    />
                    <label
                      className="sr-only"
                      htmlFor={`edit-task-due-date-${task.id}`}
                    >
                      Data de vencimento (opcional)
                    </label>
                    <input
                      id={`edit-task-due-date-${task.id}`}
                      className="due-date-input edit-due-date-input"
                      type="date"
                      value={editingDueDate}
                      onChange={(event) =>
                        setEditingDueDate(event.target.value)
                      }
                      aria-label={`Data de vencimento da tarefa: ${task.title}`}
                    />
                    <label
                      className="sr-only"
                      htmlFor={`edit-task-priority-${task.id}`}
                    >
                      Prioridade da tarefa
                    </label>
                    <select
                      id={`edit-task-priority-${task.id}`}
                      className="priority-select edit-priority-select"
                      value={editingPriority}
                      onChange={(event) =>
                        setEditingPriority(event.target.value)
                      }
                      aria-label={`Prioridade da tarefa: ${task.title}`}
                    >
                      <option value="low">Baixa</option>
                      <option value="medium">Média</option>
                      <option value="high">Alta</option>
                    </select>
                    <div className="edit-actions">
                      <button
                        type="submit"
                        className="edit-save-button"
                        disabled={!editingText.trim()}
                      >
                        Salvar
                      </button>
                      <button
                        type="button"
                        className="edit-cancel-button"
                        onClick={cancelEditing}
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <label className="task-label">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => toggleTask(task.id)}
                      />
                      <span className="custom-checkbox" aria-hidden="true">
                        <svg viewBox="0 0 16 16" fill="none">
                          <path
                            d="m3.5 8 3 3 6-6"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                      <span className="task-details">
                        <span className="task-title">{task.title}</span>
                        {task.dueDate && (
                          <span className="task-deadline">
                            <span>Vence em {formatDueDate(task.dueDate)}</span>
                            {isOverdue && (
                              <span className="overdue-label">Atrasada</span>
                            )}
                          </span>
                        )}
                        <span
                          className={`priority-indicator priority-${getTaskPriority(task.priority)}`}
                          aria-label={`Prioridade ${getPriorityLabel(getTaskPriority(task.priority)).toLowerCase()}`}
                        >
                          {getPriorityLabel(getTaskPriority(task.priority))}
                        </span>
                      </span>
                    </label>
                    <div className="task-actions">
                      <button
                        type="button"
                        className="edit-button"
                        onClick={() => startEditing(task)}
                        aria-label={`Editar tarefa: ${task.title}`}
                        title="Editar tarefa"
                      >
                        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                          <path
                            d="m13.5 4.5 2 2M5 15l3.5-.8 7.7-7.7a1.4 1.4 0 0 0-2-2l-7.7 7.7L5 15Zm0 0h10"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="delete-button"
                        onClick={() => deleteTask(task.id)}
                        aria-label={`Excluir tarefa: ${task.title}`}
                        title="Excluir tarefa"
                      >
                        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                          <path
                            d="M4.5 6h11M8 6V4.5h4V6m2.5 0-.6 9.2a1 1 0 0 1-1 .9H7.1a1 1 0 0 1-1-.9L5.5 6m3 3v4m3-4v4"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>
                  </>
                )}
              </li>
              )
            })}
          </ul>
        )}
        <footer className="panel-footer">
          Feito para deixar seu dia mais leve <span aria-hidden="true">✨</span>
        </footer>
      </section>
    </main>
  )
}

export default App
