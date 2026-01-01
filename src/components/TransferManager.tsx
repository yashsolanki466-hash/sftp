import React, { useState } from 'react'
import {
    Download,
    X,
    Pause,
    Play,
    CheckCircle2,
    FileText,
    AlertCircle,
    ChevronDown,
    ChevronUp
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export interface TransferTask {
    id: string
    name: string
    size: number
    progress: number
    status: 'downloading' | 'paused' | 'completed' | 'error' | 'canceled'
    startTime: number
    bytesDownloaded: number
    speed: number
    cancelSource?: any
}

interface TransferManagerProps {
    tasks: TransferTask[]
    onCancel: (id: string) => void
    onPause: (id: string) => void
    onResume: (id: string) => void
    isOpen: boolean
    onToggle: () => void
}

export const TransferManager: React.FC<TransferManagerProps> = ({
    tasks,
    onCancel,
    onPause,
    onResume,
    isOpen,
    onToggle
}) => {
    const [isMinimized, setIsMinimized] = useState(false)

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    const calculateETA = (task: TransferTask) => {
        if (task.status !== 'downloading' || task.speed === 0) return '--:--'
        const remaining = task.size - task.bytesDownloaded
        const seconds = Math.floor(remaining / task.speed)
        if (seconds > 3600) {
            const h = Math.floor(seconds / 3600)
            const m = Math.floor((seconds % 3600) / 60)
            return `${h}h ${m}m`
        }
        const m = Math.floor(seconds / 60)
        const s = seconds % 60
        return `${m}:${s.toString().padStart(2, '0')}`
    }

    const activeCount = tasks.filter(t => t.status === 'downloading').length
    if (tasks.length === 0) return null

    return (
        <motion.div
            initial={{ y: 400 }}
            animate={{ y: isOpen ? 0 : 400 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 right-8 z-50 pointer-events-auto"
            role="region"
            aria-label="Transfer manager"
            aria-hidden={!isOpen}
        >
            <div className="w-96 bg-white rounded-t-2xl border border-slate-200 border-b-0 shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <header
                    className="h-14 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-5 flex items-center justify-between cursor-pointer"
                    onClick={() => setIsMinimized(!isMinimized)}
                    role="button"
                    tabIndex={0}
                    aria-expanded={!isMinimized}
                >
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Download className="w-5 h-5" aria-hidden="true" />
                            {activeCount > 0 && (
                                <span className="absolute -top-1 -right-1.5 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                                    {activeCount}
                                </span>
                            )}
                        </div>
                        <span className="font-semibold text-sm">Downloads</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {isMinimized ? <ChevronUp className="w-4 h-4" aria-hidden="true" /> : <ChevronDown className="w-4 h-4" aria-hidden="true" />}
                        <button
                            onClick={(e) => { e.stopPropagation(); onToggle() }}
                            className="p-1 hover:bg-white/10 rounded transition-colors"
                            aria-label="Close transfers"
                        >
                            <X className="w-4 h-4" aria-hidden="true" />
                        </button>
                    </div>
                </header>

                {/* Task List */}
                {!isMinimized && (
                    <div className="max-h-80 overflow-y-auto p-4 space-y-3 custom-scrollbar" role="list">
                        <AnimatePresence>
                            {tasks.map(task => (
                                <motion.div
                                    key={task.id}
                                    layout
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="bg-slate-50 border border-slate-200 rounded-xl p-3"
                                    role="listitem"
                                >
                                    <div className="flex items-start gap-3 mb-2">
                                        <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                                            task.status === 'completed' ? 'bg-green-100 text-green-600' :
                                            task.status === 'error' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                                        }`}>
                                            {task.status === 'completed' ? <CheckCircle2 className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-semibold text-slate-900 truncate">{task.name}</h4>
                                            <p className="text-xs text-slate-500 mt-0.5">{formatBytes(task.bytesDownloaded)} / {formatBytes(task.size)}</p>
                                        </div>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            {task.status === 'downloading' && (
                                                <button onClick={() => onPause(task.id)} className="p-1 hover:bg-slate-200 rounded transition-colors">
                                                    <Pause className="w-3 h-3 text-slate-500" />
                                                </button>
                                            )}
                                            {task.status === 'paused' && (
                                                <button onClick={() => onResume(task.id)} className="p-1 hover:bg-blue-100 rounded transition-colors">
                                                    <Play className="w-3 h-3 text-blue-600" />
                                                </button>
                                            )}
                                            <button onClick={() => onCancel(task.id)} className="p-1 hover:bg-red-50 rounded transition-colors">
                                                <X className="w-3 h-3 text-red-500" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                            <motion.div
                                                className={`h-full transition-all ${
                                                    task.status === 'completed' ? 'bg-green-500' :
                                                    task.status === 'paused' ? 'bg-amber-500' :
                                                    task.status === 'error' ? 'bg-red-500' : 'bg-blue-500'
                                                }`}
                                                initial={{ width: 0 }}
                                                animate={{ width: `${task.progress}%` }}
                                            />
                                        </div>
                                        {task.status === 'downloading' && (
                                            <div className="flex items-center justify-between text-xs text-slate-500">
                                                <span>{task.progress}%</span>
                                                <span>{formatBytes(task.speed)}/s</span>
                                                <span>{calculateETA(task)}</span>
                                            </div>
                                        )}
                                    </div>

                                    {task.status === 'error' && (
                                        <div className="mt-2 flex items-center gap-1 text-red-600 text-xs font-medium">
                                            <AlertCircle className="w-3 h-3" />
                                            Transfer failed
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </motion.div>
    )
}
