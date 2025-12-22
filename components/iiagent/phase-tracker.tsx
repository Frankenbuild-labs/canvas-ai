"use client"

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type Phase = 'brainstorming' | 'planning' | 'building' | 'reviewing' | 'finalizing' | 'idle'

interface PhaseTrackerProps {
  currentPhase?: Phase
  className?: string
}

const phases: { id: Phase; label: string; icon: string }[] = [
  { id: 'brainstorming', label: 'Brainstorming', icon: '💡' },
  { id: 'planning', label: 'Planning', icon: '📋' },
  { id: 'building', label: 'Building', icon: '🔨' },
  { id: 'reviewing', label: 'Reviewing', icon: '🔍' },
  { id: 'finalizing', label: 'Finalizing', icon: '✨' },
]

export function PhaseTracker({ currentPhase = 'idle', className = '' }: PhaseTrackerProps) {
  const [activePhase, setActivePhase] = useState<Phase>(currentPhase)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [transitionText, setTransitionText] = useState('')

  useEffect(() => {
    if (currentPhase !== activePhase && currentPhase !== 'idle') {
      setIsTransitioning(true)
      setTransitionText(`Switching to ${phases.find(p => p.id === currentPhase)?.label}...`)
      
      const timer = setTimeout(() => {
        setActivePhase(currentPhase)
        setIsTransitioning(false)
      }, 1500)

      return () => clearTimeout(timer)
    }
  }, [currentPhase, activePhase])

  const currentPhaseIndex = phases.findIndex(p => p.id === activePhase)

  return (
    <div className={`relative py-1 px-3 bg-black -mt-2 ${className}`}>
      
      <div className="relative max-w-4xl mx-auto">
        {/* Phase Timeline */}
        <div className="relative">
          {/* Progress Line */}
          <div className="absolute top-4 left-0 right-0 h-0.5 bg-neutral-700 mx-12" />
          <motion.div
            className="absolute top-4 left-0 h-0.5 bg-gradient-to-r from-teal-500 to-cyan-400 mx-12"
            initial={{ width: '0%' }}
            animate={{
              width: activePhase === 'idle' ? '0%' : `${(currentPhaseIndex / (phases.length - 1)) * 100}%`,
            }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
          />

          {/* Phase Nodes */}
          <div className="flex justify-between items-center relative z-10">
            {phases.map((phase, index) => {
              const isActive = phase.id === activePhase
              const isPast = currentPhaseIndex > index
              const isCurrent = currentPhaseIndex === index

              return (
                <div key={phase.id} className="flex flex-col items-center gap-1 flex-1">
                  {/* Node Circle */}
                  <motion.div
                    className={`relative flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300 ${
                      isCurrent
                        ? 'border-teal-400 bg-teal-500/20 shadow-lg shadow-teal-500/50'
                        : isPast
                        ? 'border-teal-600 bg-teal-600/10'
                        : 'border-neutral-700 bg-neutral-800'
                    }`}
                    animate={
                      isCurrent
                        ? {
                            scale: [1, 1.1, 1],
                            boxShadow: [
                              '0 0 10px rgba(20, 184, 166, 0.3)',
                              '0 0 20px rgba(20, 184, 166, 0.6)',
                              '0 0 10px rgba(20, 184, 166, 0.3)',
                            ],
                          }
                        : {}
                    }
                    transition={{
                      duration: 2,
                      repeat: isCurrent ? Infinity : 0,
                      ease: 'easeInOut',
                    }}
                  >
                    {/* Icon */}
                    <span className="text-sm">{phase.icon}</span>

                    {/* Pulse rings for active phase */}
                    {isCurrent && (
                      <>
                        <motion.div
                          className="absolute inset-0 rounded-full border-2 border-teal-400"
                          animate={{
                            scale: [1, 1.5, 1],
                            opacity: [0.5, 0, 0.5],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: 'easeOut',
                          }}
                        />
                      </>
                    )}

                    {/* Checkmark for completed phases */}
                    {isPast && !isCurrent && (
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-teal-500 rounded-full flex items-center justify-center"
                      >
                        <svg
                          className="w-2 h-2 text-white"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      </motion.div>
                    )}
                  </motion.div>

                  {/* Label */}
                  <motion.div
                    className={`text-[10px] font-medium text-center transition-colors duration-300 ${
                      isCurrent
                        ? 'text-teal-400'
                        : isPast
                        ? 'text-teal-600'
                        : 'text-neutral-500'
                    }`}
                    animate={
                      isCurrent
                        ? {
                            opacity: [1, 0.7, 1],
                          }
                        : {}
                    }
                    transition={{
                      duration: 1.5,
                      repeat: isCurrent ? Infinity : 0,
                      ease: 'easeInOut',
                    }}
                  >
                    {phase.label}
                  </motion.div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Status Message - Compact */}
        <AnimatePresence mode="wait">
          {activePhase !== 'idle' && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="mt-2 text-center"
            >
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-teal-500/10 border border-teal-500/30 rounded-full">
                <motion.div
                  className="w-1.5 h-1.5 bg-teal-400 rounded-full"
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [1, 0.5, 1],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
                <span className="text-[10px] text-teal-300">
                  {phases[currentPhaseIndex]?.label}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
