'use client'

import { useEffect, useId, useRef, useState, type FocusEvent } from 'react'

import { Info } from 'lucide-react'

interface HelpPopoverProps {
  content: string
  label: string
  className?: string
}

function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function HelpPopover({ content, label, className }: HelpPopoverProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPinned, setIsPinned] = useState(false)
  const contentId = useId()
  const wrapperRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
        setIsPinned(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
        setIsPinned(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  function handleBlur(event: FocusEvent<HTMLSpanElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null) && !isPinned) {
      setIsOpen(false)
    }
  }

  return (
    <span
      ref={wrapperRef}
      onMouseEnter={() => {
        if (!isPinned) {
          setIsOpen(true)
        }
      }}
      onMouseLeave={() => {
        if (!isPinned) {
          setIsOpen(false)
        }
      }}
      onFocus={() => {
        if (!isPinned) {
          setIsOpen(true)
        }
      }}
      onBlur={handleBlur}
      className={cn('relative inline-flex', className)}
    >
      <button
        type="button"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={() => {
          setIsPinned((currentPinned) => {
            const nextPinned = !currentPinned
            setIsOpen(nextPinned)
            return nextPinned
          })
        }}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        <Info className="h-3.5 w-3.5" aria-hidden="true" />
      </button>

      {isOpen ? (
        <span
          id={contentId}
          role="dialog"
          className="absolute left-0 top-6 z-30 w-72 rounded-md border border-gray-200 bg-white p-3 text-xs leading-relaxed text-gray-700 shadow-lg"
        >
          {content}
        </span>
      ) : null}
    </span>
  )
}
