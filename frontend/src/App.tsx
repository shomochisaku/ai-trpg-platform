import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div>
        <h1>AI TRPG Platform</h1>
        <div className="card">
          <button onClick={() => setCount((count) => count + 1)}>
            count is {count}
          </button>
          <p>
            React + TypeScript + Vite frontend is ready!
          </p>
        </div>
        <p className="read-the-docs">
          Begin your AI-driven TRPG adventure
        </p>
      </div>
    </>
  )
}

export default App