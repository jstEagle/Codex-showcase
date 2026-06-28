'use client'

import { ArrowUp, ChevronDown, Mic, Plus, Shield, Zap } from 'lucide-react'
import { useId } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'

export function Composer({
  value,
  onChange,
  onSubmit,
  placeholder = 'Search apps, agents, demos, workflows…',
  scope = 'Public showcase',
  mode = 'Semantic search',
  canSubmit = true,
}: {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  placeholder?: string
  scope?: string
  mode?: string
  canSubmit?: boolean
}) {
  const id = useId()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      onSubmit()
    }
  }

  return (
    <form className="codex-composer" onSubmit={handleSubmit}>
      <label className="sr" htmlFor={id}>
        {placeholder}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={1}
      />
      <div className="composer-actions">
        <button className="bare-icon" type="button" aria-label="Add context">
          <Plus size={19} />
        </button>
        <button className="access-pill" type="button">
          <Shield size={15} />
          <span>{scope}</span>
          <ChevronDown size={13} />
        </button>
        <span className="composer-fill" />
        <button className="model-pill" type="button">
          <Zap size={14} />
          <span>{mode}</span>
          <ChevronDown size={13} />
        </button>
        <button className="bare-icon" type="button" aria-label="Voice input">
          <Mic size={16} />
        </button>
        <button
          className="submit-button"
          type="submit"
          aria-label="Submit"
          disabled={!canSubmit}
        >
          <ArrowUp size={18} />
        </button>
      </div>
    </form>
  )
}
