const THREAD_ID_KEY = 'ai_screen_design:threadId'

export function getThreadId() {
  return localStorage.getItem(THREAD_ID_KEY)
}

export function setThreadId(threadId: string) {
  localStorage.setItem(THREAD_ID_KEY, threadId)
}

export function deleteThreadId() {
  localStorage.removeItem(THREAD_ID_KEY)
}
