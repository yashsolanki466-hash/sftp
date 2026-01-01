import React, { useState } from 'react'
import { Server, User, Lock as LockIcon, ArrowRight, Loader2, CheckCircle2, Shield } from 'lucide-react'
import { sftpApi } from '../api/sftp'
import type { SessionInfo } from '../types'

interface FormData {
    server: string
    port: number
    username: string
    password: string
    path: string
}

interface LoginPageProps {
    onLogin: (session: SessionInfo) => void
    initialPath?: string
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, initialPath }) => {
    const [formData, setFormData] = useState<FormData>({
        server: '',
        port: 22,
        username: '',
        password: '',
        path: initialPath || '/'
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        let server = formData.server.trim()

        if (server.toLowerCase().startsWith('ftp://')) {
            server = server.replace(/ftp:\/\//i, '')
        } else if (server.toLowerCase().startsWith('sftp://')) {
            server = server.replace(/sftp:\/\//i, '')
        }

        try {
            const response = await sftpApi.connect({ ...formData, server })
            onLogin({
                sessionId: response.data.sessionId,
                server: server,
                username: formData.username,
                currentPath: formData.path
            } as SessionInfo)
        } catch (err: any) {
            const errorMsg = err.response?.data?.error || 'Failed to connect to server'
            setError(errorMsg)
        } finally {
            setLoading(false)
        }
    }

    React.useEffect(() => {
        if (initialPath) {
            setFormData(prev => ({ ...prev, path: initialPath }))
        }
    }, [initialPath])

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-unigenome-navy/5 to-white flex items-center justify-center p-6 relative overflow-hidden">
            {/* Decorative Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-unigenome-orange/10 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-unigenome-navy/10 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{animationDelay: '2s'}}></div>
            </div>

            <div className="w-full max-w-lg relative z-10">
                <div className="card-premium p-8 md:p-10 overflow-hidden">
                    {/* Brand Header */}
                    <div className="text-center mb-10">
                        <div className="flex items-center justify-center gap-2 mb-6">
                            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-unigenome-accent shadow-lg">
                                <Shield className="w-7 h-7 text-white" aria-hidden="true" />
                            </div>
                        </div>
                        <h1 className="text-4xl font-bold brand-name mb-1 text-unigenome-navy">Unigenome</h1>
                        <p className="text-sm text-slate-500 mb-1">by <span className="brand-accent font-semibold italic">Unipath</span></p>
                        <p className="brand-subtitle">Secure File Transfer Portal</p>
                        <div className="flex items-center justify-center gap-2 mt-4 text-xs text-slate-400">
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" aria-hidden="true" />
                            <span>Military-grade encryption</span>
                        </div>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-5" noValidate>
                        {/* Server & Port */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-3">
                                <label htmlFor="server" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Server Address</label>
                                <div className="relative">
                                    <Server className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
                                    <input
                                        id="server"
                                        type="text"
                                        required
                                        className="input-field pl-10 w-full"
                                        placeholder="sftp.example.com"
                                        value={formData.server}
                                        onChange={(e) => setFormData({ ...formData, server: e.target.value })}
                                        aria-label="SFTP server hostname"
                                    />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="port" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Port</label>
                                <input
                                    id="port"
                                    type="number"
                                    className="input-field w-full"
                                    value={formData.port || ''}
                                    onChange={(e) => {
                                        const val = e.target.value
                                        setFormData({ ...formData, port: val === '' ? 0 : parseInt(val) })
                                    }}
                                    aria-label="SFTP port number"
                                />
                            </div>
                        </div>

                        {/* Credentials */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="username" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Username</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
                                    <input
                                        id="username"
                                        type="text"
                                        required
                                        className="input-field pl-10 w-full"
                                        placeholder="your.username"
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        aria-label="SFTP username"
                                    />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="password" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Password</label>
                                <div className="relative">
                                    <LockIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
                                    <input
                                        id="password"
                                        type="password"
                                        required
                                        className="input-field pl-10 w-full"
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        aria-label="SFTP password"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Initial Path */}
                        <div>
                            <label htmlFor="path" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Initial Path</label>
                            <input
                                id="path"
                                type="text"
                                className="input-field w-full"
                                placeholder="/"
                                value={formData.path}
                                onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                                aria-label="Initial SFTP path"
                            />
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl animate-slideIn" role="alert" aria-live="polite">
                                <div className="flex-shrink-0 mt-0.5">
                                    <div className="flex items-center justify-center h-5 w-5 rounded-full bg-red-100">
                                        <span className="text-red-600 text-xs font-bold">!</span>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-red-800">{error}</p>
                                </div>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn-primary py-3 font-semibold flex items-center justify-center gap-2 group"
                            aria-busy={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                                    <span>Connecting...</span>
                                </>
                            ) : (
                                <>
                                    <span>Initialize Secure Session</span>
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                        <div className="mt-8 pt-6 border-t border-slate-200">
                        <p className="text-center text-xs text-slate-400">
                            Powered by <span className="font-semibold text-unigenome-navy">Unigenome</span> • <span className="font-semibold italic text-unigenome-orange">Unipath</span> Specialty Laboratory
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
