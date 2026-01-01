import React, { useState, useEffect, useCallback } from 'react'
import {
    Folder,
    File,
    Search,
    Download,
    RefreshCw,
    Upload,
    Home,
    ChevronRight,
    LogOut,
    HardDrive,
    Activity,
    ArrowLeft,
    Shield,
    Eye,
} from 'lucide-react'
import { sftpApi } from '../api/sftp'
import type { SFTPFile, SessionInfo } from '../types'
import { motion, AnimatePresence } from 'framer-motion'
import { TransferManager } from './TransferManager'
import type { TransferTask } from './TransferManager'
import axios from 'axios'

interface DashboardStats {
    folders: number
    files: number
    size: number
}

interface FileCardProps {
    file: SFTPFile
    onClick: () => void
    onDownload: () => void
    formatBytes: (bytes: number) => string
    selected: boolean
    onSelect: () => void
}

interface DashboardProps {
    session: SessionInfo
    onLogout: () => void
}

export const Dashboard: React.FC<DashboardProps> = ({ session, onLogout }) => {
    const [files, setFiles] = useState<SFTPFile[]>([])
    const [loading, setLoading] = useState(true)
    const [currentPath, setCurrentPath] = useState(session.currentPath)
    const [search, setSearch] = useState('')
    const [stats, setStats] = useState<DashboardStats>({ folders: 0, files: 0, size: 0 })
    const [tasks, setTasks] = useState<TransferTask[]>([])
    const [isTransferManagerOpen, setIsTransferManagerOpen] = useState(false)
    const [selectedPaths, setSelectedPaths] = useState<string[]>([])
    const [previewFile, setPreviewFile] = useState<SFTPFile | null>(null)
    const [previewContent, setPreviewContent] = useState<string | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [previewLoading, setPreviewLoading] = useState(false)

    const fetchFiles = useCallback(async (path: string) => {
        setLoading(true)
        try {
            const response = await sftpApi.list(session.sessionId, path)
            const sortedFiles = [...response.data.files].sort((a: SFTPFile, b: SFTPFile) => {
                if (a.isDirectory && !b.isDirectory) return -1
                if (!a.isDirectory && b.isDirectory) return 1
                return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
            })

            setFiles(sortedFiles)
            setCurrentPath(path)

            const folders = sortedFiles.filter((f: SFTPFile) => f.isDirectory).length
            const fileCount = sortedFiles.length - folders
            const totalSize = sortedFiles.reduce((acc: number, f: SFTPFile) => acc + (f.size || 0), 0)
            setStats({ folders, files: fileCount, size: totalSize })
        } catch (err) {
            console.error('Failed to fetch files', err)
        } finally {
            setLoading(false)
            setSelectedPaths([])
            setPreviewFile(null)
            setPreviewContent(null)
            if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null) }
        }
    }, [session.sessionId, previewUrl])

    const openPreview = useCallback(async (file: SFTPFile) => {
        setPreviewFile(file)
        setPreviewContent(null)
        if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null) }
        setPreviewLoading(true)

        const ext = (file.name.split('.').pop() || '').toLowerCase()
        const textExt = ['txt','csv','tsv','gtf','bed','json','md','log']
        const imgExt = ['png','jpg','jpeg','svg','gif','webp']

        try {
            // Guard: don't attempt to preview very large files in-browser
            const MAX_PREVIEW = 2 * 1024 * 1024 // 2 MB
            if (file.size && file.size > MAX_PREVIEW) {
                setPreviewContent('File too large to preview in the browser (over 2 MB). Please download to view it locally.')
                setPreviewLoading(false)
                return
            }
            if (textExt.includes(ext)) {
                const resp = await sftpApi.preview(session.sessionId, file.path)
                setPreviewContent(resp.data || '')
            } else if (imgExt.includes(ext)) {
                const resp = await sftpApi.download(session.sessionId, file.path, { responseType: 'blob' })
                const url = window.URL.createObjectURL(new Blob([resp.data]))
                setPreviewUrl(url)
            } else {
                setPreviewContent('Preview not available for this file type.')
            }
        } catch (err) {
            console.error('Preview failed', err)
            setPreviewContent('Failed to load preview.')
        } finally {
            setPreviewLoading(false)
        }
    }, [session.sessionId, previewUrl])

    useEffect(() => {
        fetchFiles(currentPath)
    }, [currentPath, fetchFiles])

    const handleDownload = useCallback(async (file: SFTPFile) => {
        const taskId = Math.random().toString(36).substr(2, 9)
        const cancelSource = axios.CancelToken.source()

        const newTask: TransferTask = {
            id: taskId,
            name: file.name,
            size: file.size,
            progress: 0,
            status: 'downloading',
            startTime: Date.now(),
            bytesDownloaded: 0,
            speed: 0,
            cancelSource
        }

        setTasks(prev => [newTask, ...prev])
        setIsTransferManagerOpen(true)

        try {
            const response = await sftpApi.download(session.sessionId, file.path, {
                cancelToken: cancelSource.token,
                onDownloadProgress: (progressEvent: any) => {
                    const loaded = progressEvent.loaded
                    const total = progressEvent.total || file.size
                    const progress = Math.round((loaded * 100) / total)
                    const elapsed = (Date.now() - newTask.startTime) / 1000
                    const speed = elapsed > 0 ? Math.round(loaded / elapsed) : 0

                    setTasks(prev => prev.map(t =>
                        t.id === taskId
                            ? { ...t, progress, bytesDownloaded: loaded, speed }
                            : t
                    ))
                }
            })

            setTasks(prev => prev.map(t =>
                t.id === taskId
                    ? { ...t, progress: 100, status: 'completed', bytesDownloaded: file.size, speed: 0 }
                    : t
            ))

            const url = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', file.name)
            document.body.appendChild(link)
            link.click()
            link.remove()
        } catch (err: any) {
            if (axios.isCancel(err)) {
                setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'canceled' } : t))
            } else {
                console.error('Download failed', err)
                setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'error' } : t))
            }
        }
    }, [session.sessionId])

    const handleCancelTransfer = useCallback((id: string) => {
        const task = tasks.find(t => t.id === id)
        if (task?.cancelSource) task.cancelSource.cancel('User canceled')
        setTasks(prev => prev.filter(t => t.id !== id))
    }, [tasks])

    const handlePauseTransfer = useCallback((id: string) => {
        const task = tasks.find(t => t.id === id)
        if (task?.cancelSource) task.cancelSource.cancel('Paused')
        setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'paused', cancelSource: null } : t))
    }, [tasks])

    const handleResumeTransfer = useCallback(async (id: string) => {
        const task = tasks.find(t => t.id === id)
        if (!task) return
        const file = files.find(f => f.name === task.name)
        if (!file) return

        const cancelSource = axios.CancelToken.source()
        const startByte = task.bytesDownloaded
        setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'downloading', cancelSource } : t))

        try {
            const response = await sftpApi.download(session.sessionId, file.path, {
                cancelToken: cancelSource.token,
                headers: { 'Range': `bytes=${startByte}-` },
                onDownloadProgress: (progressEvent: any) => {
                    const newlyLoaded = progressEvent.loaded
                    const loaded = startByte + newlyLoaded
                    const total = file.size
                    const progress = Math.round((loaded * 100) / total)
                    const elapsed = (Date.now() - task.startTime) / 1000
                    const speed = elapsed > 0 ? Math.round(loaded / elapsed) : 0
                    setTasks(prev => prev.map(t =>
                        t.id === id ? { ...t, progress, bytesDownloaded: loaded, speed } : t
                    ))
                }
            })

            setTasks(prev => prev.map(t =>
                t.id === id
                    ? { ...t, progress: 100, status: 'completed', bytesDownloaded: file.size, speed: 0 }
                    : t
            ))

            const url = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', file.name)
            document.body.appendChild(link)
            link.click()
            link.remove()
        } catch (err: any) {
            if (!axios.isCancel(err)) {
                setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'error' } : t))
            }
        }
    }, [session.sessionId, files, tasks])

    const formatBytes = useCallback((bytes: number): string => {
        if (bytes === 0) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }, [])

    const toggleSelectPath = useCallback((path: string) => {
        setSelectedPaths(prev => prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path])
    }, [])

    const selectAll = useCallback(() => {
        const all = files.filter(f => !f.isDirectory).map(f => f.path)
        setSelectedPaths(all)
    }, [files])

    const selectVisible = useCallback(() => {
        // Compute visible files from current `files` and `search` instead of
        // relying on `filteredFiles` which is declared later (avoids TDZ error).
        const vis = files
            .filter(f => f.name.toLowerCase().includes(search.toLowerCase()))
            .filter(f => !f.isDirectory)
            .map(f => f.path)
        setSelectedPaths(vis)
    }, [files, search])

    const clearSelection = useCallback(() => setSelectedPaths([]), [])

    const handleBatchDownload = useCallback(async () => {
        if (selectedPaths.length === 0) return
        const taskId = Math.random().toString(36).substr(2, 9)
        const cancelSource = axios.CancelToken.source()

        const newTask: TransferTask = {
            id: taskId,
            name: `${selectedPaths.length} items`,
            size: 0,
            progress: 0,
            status: 'downloading',
            startTime: Date.now(),
            bytesDownloaded: 0,
            speed: 0,
            cancelSource
        }

        setTasks(prev => [newTask, ...prev])
        setIsTransferManagerOpen(true)

        try {
            const response = await sftpApi.batchDownload(session.sessionId, selectedPaths, {
                cancelToken: cancelSource.token,
                onDownloadProgress: (ev: any) => {
                    const loaded = ev.loaded
                    const total = ev.total || 0
                    const progress = total > 0 ? Math.round((loaded * 100) / total) : 0
                    const elapsed = (Date.now() - newTask.startTime) / 1000
                    const speed = elapsed > 0 ? Math.round(loaded / elapsed) : 0
                    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, progress, bytesDownloaded: loaded, speed } : t))
                }
            })

            const contentType = response.headers['content-type'] || response.headers['Content-Type'] || ''
            if (contentType.includes('application/json') || contentType.includes('text/html')) {
                const text = await new Response(response.data).text()
                throw new Error(text || 'Server error')
            }

            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, progress: 100, status: 'completed' } : t))

            const url = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', 'files.zip')
            document.body.appendChild(link)
            link.click()
            link.remove()
            setSelectedPaths([])
        } catch (err: any) {
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'error' } : t))
        }
    }, [session.sessionId, selectedPaths])

    const filteredFiles = files.filter(f => f.name.toLowerCase().includes(search.toLowerCase()))
    const breadcrumbs = currentPath.split('/').filter(p => p)

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-slate-200 flex flex-col items-stretch z-20">
                <div className="p-6 border-b border-slate-200">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-gradient-unigenome-accent flex items-center justify-center">
                            <Shield className="w-6 h-6 text-white" aria-hidden="true" />
                        </div>
                        <h1 className="text-xl font-bold brand-name brand-name font-display text-unigenome-navy">Unigenome</h1>
                    </div>
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Specialty Laboratory</p>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-2" aria-label="Main navigation">
                    <button
                        onClick={() => fetchFiles('/')}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-all font-medium group"
                        aria-label="Navigate to root directory"
                    >
                        <Home className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" aria-hidden="true" />
                        <span className="text-sm">Root</span>
                    </button>

                    <div className="pt-4 pb-2 px-4">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Connection</p>
                        <div className="space-y-3 text-sm">
                            <div>
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Server</p>
                                <p className="text-slate-600 font-mono text-xs truncate" title={session.server}>{session.server}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">User</p>
                                <p className="text-slate-600 font-medium text-xs" title={session.username}>{session.username}</p>
                            </div>
                        </div>
                    </div>
                </nav>

                <div className="p-4 border-t border-slate-200">
                    <button
                        onClick={onLogout}
                        className="w-full btn-secondary py-2.5 text-sm font-semibold"
                        aria-label="Logout from session"
                    >
                        <LogOut className="w-4 h-4" aria-hidden="true" />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col relative overflow-hidden">
                {/* Header */}
                <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between z-10">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                        <button
                            onClick={() => {
                                const parts = currentPath.split('/')
                                parts.pop()
                                fetchFiles(parts.join('/') || '/')
                            }}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-all"
                            aria-label="Navigate to parent directory"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-500" aria-hidden="true" />
                        </button>
                        <nav className="flex items-center gap-1 overflow-x-auto whitespace-nowrap py-2" aria-label="Breadcrumb">
                            <button
                                onClick={() => fetchFiles('/')}
                                className="text-slate-500 hover:text-blue-600 font-medium text-sm px-2"
                            >
                                Root
                            </button>
                            {breadcrumbs.map((part, i) => (
                                <React.Fragment key={i}>
                                    <ChevronRight className="w-4 h-4 text-slate-300" aria-hidden="true" />
                                    <button
                                        onClick={() => fetchFiles('/' + breadcrumbs.slice(0, i + 1).join('/'))}
                                        className={`text-sm font-medium px-2 transition-colors ${i === breadcrumbs.length - 1 ? 'text-slate-900' : 'text-slate-500 hover:text-blue-600'}`}
                                    >
                                        {part}
                                    </button>
                                </React.Fragment>
                            ))}
                        </nav>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="relative hidden md:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
                            <input
                                type="text"
                                placeholder="Search files..."
                                className="input-field pl-9 pr-4 py-2 text-sm w-48"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                aria-label="Search files"
                            />
                        </div>
                        <button
                            onClick={() => fetchFiles(currentPath)}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-all"
                            aria-label="Refresh file list"
                        >
                            <RefreshCw className={`w-5 h-5 text-slate-500 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
                        </button>
                    </div>
                </header>

                {/* Stats Bar */}
                <div className="px-8 py-4 bg-white border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                            <span className="text-xs font-semibold text-slate-500 uppercase">Active</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                            <div>
                                <p className="text-xs text-slate-500 font-semibold">Folders</p>
                                <p className="text-lg font-bold text-slate-900">{stats.folders}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 font-semibold">Files</p>
                                <p className="text-lg font-bold text-slate-900">{stats.files}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 font-semibold">Total</p>
                                <p className="text-lg font-bold text-slate-900">{formatBytes(stats.size)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button className="btn-secondary px-4 py-2 text-sm" disabled aria-label="Upload files">
                            <Upload className="w-4 h-4" aria-hidden="true" />
                            <span>Upload</span>
                        </button>
                        <button
                            onClick={handleBatchDownload}
                            disabled={selectedPaths.length === 0}
                            className="btn-primary px-4 py-2 text-sm font-semibold"
                        >
                            <Download className="w-4 h-4" aria-hidden="true" />
                            <span>Download ({selectedPaths.length})</span>
                        </button>
                    </div>
                </div>

                {/* Selection Bar */}
                {selectedPaths.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="selection-bar sticky px-8 py-3 bg-blue-50 border-b border-blue-200 flex items-center justify-between"
                    >
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-semibold text-blue-900">{selectedPaths.length} selected</span>
                            <button onClick={selectVisible} className="text-xs font-medium text-blue-600 hover:text-blue-700" aria-label="Select visible files">Select visible</button>
                            <button onClick={selectAll} className="text-xs font-medium text-blue-600 hover:text-blue-700" aria-label="Select all files">Select all</button>
                            <button onClick={clearSelection} className="text-xs font-medium text-blue-600 hover:text-blue-700" aria-label="Clear selection">Clear</button>
                        </div>

                        <div className="flex items-center gap-3">
                            <button onClick={handleBatchDownload} className="btn-accent px-4 py-2 text-sm" aria-label="Download selected files">Download Selected</button>
                        </div>
                    </motion.div>
                )}

                {/* Files Grid */}
                <div className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center">
                            <LoaderAnimation />
                            <p className="mt-4 text-sm font-medium text-slate-500">Loading files...</p>
                        </div>
                    ) : filteredFiles.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center">
                            <HardDrive className="w-12 h-12 text-slate-300 mb-4" aria-hidden="true" />
                            <p className="text-lg font-semibold text-slate-600">No files found</p>
                            <p className="text-sm text-slate-500 mt-1">This directory is empty or no files match your search</p>
                        </div>
                    ) : (
                        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            <AnimatePresence mode="popLayout">
                                {filteredFiles.map((file) => (
                                    <FileCard
                                        key={file.path}
                                        file={file}
                                        onClick={() => file.isDirectory ? fetchFiles(file.path) : openPreview(file)}
                                        onDownload={() => handleDownload(file)}
                                        formatBytes={formatBytes}
                                        selected={selectedPaths.includes(file.path)}
                                        onSelect={() => toggleSelectPath(file.path)}
                                    />
                                ))}
                            </AnimatePresence>
                        </motion.div>
                    )}
                </div>
            </main>

            {/* Preview Sidebar */}
            {previewFile && (
                <motion.aside
                    initial={{ x: 400, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 400, opacity: 0 }}
                    className="w-96 bg-white border-l border-slate-200 flex flex-col overflow-hidden"
                    role="complementary"
                    aria-label="File preview"
                >
                    <div className="p-6 border-b border-slate-200 flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-slate-900 truncate" title={previewFile.name}>{previewFile.name}</h3>
                            <p className="text-xs text-slate-500 mt-1">{previewFile.isDirectory ? 'Folder' : formatBytes(previewFile.size)}</p>
                        </div>
                        <button
                            onClick={() => setPreviewFile(null)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"
                        >
                            <span className="sr-only">Close preview</span>✕
                        </button>
                    </div>

                    <div className="flex-1 p-6 bg-slate-50 overflow-auto">
                        {previewLoading ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="text-center">
                                    <div className="w-8 h-8 rounded-full border-2 border-slate-300 border-t-blue-600 animate-spin mx-auto mb-2"></div>
                                    <p className="text-xs text-slate-500">Loading...</p>
                                </div>
                            </div>
                        ) : previewUrl ? (
                            <img src={previewUrl} alt={previewFile.name} className="w-full h-auto object-contain rounded-lg" />
                        ) : previewContent ? (
                            <pre className="whitespace-pre-wrap text-xs text-slate-700 font-mono bg-white p-4 rounded-lg">{previewContent.slice(0, 1000)}</pre>
                        ) : (
                            <div className="flex items-center justify-center h-full text-center">
                                <div>
                                    <Eye className="w-8 h-8 text-slate-300 mx-auto mb-2" aria-hidden="true" />
                                    <p className="text-sm font-medium text-slate-600">No preview available</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-6 border-t border-slate-200 flex gap-2">
                        <button onClick={() => handleDownload(previewFile)} className="btn-primary flex-1 py-2 text-sm" aria-label="Download file">
                            <Download className="w-4 h-4" aria-hidden="true" />
                            Download
                        </button>
                    </div>
                </motion.aside>
            )}

            <TransferManager
                tasks={tasks}
                onCancel={handleCancelTransfer}
                onPause={handlePauseTransfer}
                onResume={handleResumeTransfer}
                isOpen={isTransferManagerOpen}
                onToggle={() => setIsTransferManagerOpen(!isTransferManagerOpen)}
            />
        </div>
    )
}

const LoaderAnimation = () => (
    <div className="flex gap-1 items-center justify-center">
        <div className="w-2 h-8 bg-blue-600 rounded-full animate-[loading_1s_ease-in-out_infinite]"></div>
        <div className="w-2 h-8 bg-blue-500 rounded-full animate-[loading_1s_ease-in-out_0.2s_infinite]"></div>
        <div className="w-2 h-8 bg-blue-400 rounded-full animate-[loading_1s_ease-in-out_0.4s_infinite]"></div>
    </div>
)

const getFileIcon = (fileName: string, isDirectory: boolean) => {
    if (isDirectory) return <Folder className="w-6 h-6 fill-current text-blue-600" aria-hidden="true" />
    const ext = fileName.toLowerCase().split('.').pop()
    if (['fastq', 'fq', 'gz'].includes(ext || '')) return <Activity className="w-6 h-6 text-emerald-600" aria-hidden="true" />
    if (['bam', 'sam', 'bai'].includes(ext || '')) return <HardDrive className="w-6 h-6 text-blue-600" aria-hidden="true" />
    if (['vcf', 'bcf', 'bed'].includes(ext || '')) return <Shield className="w-6 h-6 text-purple-600" aria-hidden="true" />
    if (['pdf', 'doc', 'docx', 'txt'].includes(ext || '')) return <File className="w-6 h-6 text-orange-600" aria-hidden="true" />
    return <File className="w-6 h-6 text-slate-400" aria-hidden="true" />
}

const FileCard: React.FC<FileCardProps> = ({ file, onClick, onDownload, formatBytes, selected, onSelect }) => {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            whileHover={{ translateY: -2 }}
            className={`card p-4 cursor-pointer group relative flex flex-col overflow-hidden hover:border-blue-200 file-card`}
            onClick={onClick}
            role="listitem"
            tabIndex={0}
            aria-selected={selected}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    e.preventDefault()
                    onClick()
                }
                if (e.key === ' ' || e.key === 'Spacebar') {
                    e.preventDefault()
                    onSelect()
                }
            }}
        >
            <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-lg bg-blue-50 group-hover:bg-blue-100 transition-colors">
                    {getFileIcon(file.name, file.isDirectory)}
                </div>
                <input
                    type="checkbox"
                    checked={!!selected}
                    onChange={(e) => { e.stopPropagation(); onSelect() }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 cursor-pointer"
                    aria-label={`Select ${file.name}`}
                />
            </div>

            <h3 className="font-semibold text-slate-900 text-sm line-clamp-2 mb-2 flex-1" title={file.name}>{file.name}</h3>

            <div className="flex items-center justify-between text-xs text-slate-500 mb-3 pt-2 border-t border-slate-100">
                <span>{file.isDirectory ? 'Folder' : formatBytes(file.size)}</span>
                {!file.isDirectory && <span>{file.name.split('.').pop()?.toUpperCase()}</span>}
            </div>

            {!file.isDirectory && (
                <button
                    onClick={(e) => { e.stopPropagation(); onDownload() }}
                    className="btn-primary w-full py-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={`Download ${file.name}`}
                >
                    <Download className="w-3 h-3" aria-hidden="true" />
                    <span className="ml-2">Download</span>
                </button>
            )}
        </motion.div>
    )
}
