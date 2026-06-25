"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  Mail, RefreshCw, Plug, PlugZap, AlertCircle, CheckCircle2,
  Loader2, Folder, FolderOpen, Info, ExternalLink, Trash2
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { cn, formatDateTime } from "@/lib/utils"

interface EmailFolder {
  id: string
  name: string
  isSelected: boolean
  totalCount: number | null
  unreadCount: number | null
}

interface EmailAccount {
  id: string
  provider: "OUTLOOK" | "GMAIL"
  email: string
  displayName: string | null
  connectedAt: string
  lastSyncAt: string | null
  isActive: boolean
  folders: EmailFolder[]
  _count: { inboxItems: number }
}

interface Config {
  outlookConfigured: boolean
  gmailConfigured: boolean
}

const PROVIDER_META = {
  OUTLOOK: {
    label: "Outlook / Microsoft 365",
    icon: "📧",
    color: "from-blue-500 to-blue-600",
    authPath: "/api/auth/outlook/start",
    setupUrl: "https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade",
    setupLabel: "Azure App Registration",
    scopes: ["Mail.Read", "offline_access", "User.Read"],
  },
  GMAIL: {
    label: "Gmail / Google Workspace",
    icon: "📬",
    color: "from-red-500 to-orange-500",
    authPath: "/api/auth/gmail/start",
    setupUrl: "https://console.cloud.google.com/apis/credentials",
    setupLabel: "Google Cloud Console",
    scopes: ["gmail.readonly", "userinfo.email", "userinfo.profile"],
  },
}

export function IntegracoesClient() {
  const searchParams = useSearchParams()
  const [accounts, setAccounts] = useState<EmailAccount[]>([])
  const [config, setConfig] = useState<Config>({ outlookConfigured: false, gmailConfigured: false })
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [syncResult, setSyncResult] = useState<{ accountId: string; totalNew: number; totalSkipped: number; errors: string[] } | null>(null)
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null)

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message })
    setTimeout(() => setToast(null), 5000)
  }

  async function loadAccounts() {
    const res = await fetch("/api/integrations/accounts")
    const data = await res.json()
    setAccounts(data.accounts ?? [])
    setConfig(data.config ?? {})
    setLoading(false)
  }

  useEffect(() => {
    loadAccounts()
    // Processar parâmetros de retorno OAuth
    const success = searchParams.get("success")
    const error = searchParams.get("error")
    if (success === "outlook") showToast("success", "Outlook conectado com sucesso!")
    if (success === "gmail") showToast("success", "Gmail conectado com sucesso!")
    if (error === "outlook_not_configured") showToast("error", "Configure as variáveis MICROSOFT_* no .env antes de conectar.")
    if (error === "gmail_not_configured") showToast("error", "Configure as variáveis GOOGLE_* no .env antes de conectar.")
    if (error === "outlook_auth_failed") showToast("error", "Falha na autenticação com o Outlook. Tente novamente.")
    if (error === "gmail_auth_failed") showToast("error", "Falha na autenticação com o Gmail. Tente novamente.")
    if (error === "outlook_denied" || error === "gmail_denied") showToast("error", "Autenticação cancelada pelo usuário.")
  }, [searchParams])

  async function toggleFolder(folderId: string, current: boolean) {
    await fetch("/api/integrations/folders/select", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderId, isSelected: !current }),
    })
    await loadAccounts()
  }

  async function disconnect(accountId: string) {
    if (!confirm("Deseja desconectar esta conta? Os e-mails já sincronizados serão mantidos.")) return
    await fetch("/api/integrations/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId }),
    })
    await loadAccounts()
    showToast("success", "Conta desconectada.")
  }

  async function syncEmails(accountId: string) {
    setSyncing(accountId)
    setSyncResult(null)
    try {
      const res = await fetch("/api/integrations/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      })
      const data = await res.json()
      if (data.error) {
        showToast("error", data.error)
      } else {
        setSyncResult({ accountId, ...data })
        showToast("success", `Sincronizado! ${data.totalNew} novo(s) e-mail(s) importado(s).`)
        await loadAccounts()
      }
    } catch {
      showToast("error", "Erro ao sincronizar e-mails.")
    } finally {
      setSyncing(null)
    }
  }

  const connectedOutlook = accounts.find(a => a.provider === "OUTLOOK")
  const connectedGmail = accounts.find(a => a.provider === "GMAIL")

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Toast */}
      {toast && (
        <div className={cn(
          "fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-fade-in max-w-sm",
          toast.type === "success"
            ? "bg-green-600 text-white"
            : "bg-red-600 text-white"
        )}>
          {toast.type === "success"
            ? <CheckCircle2 className="w-4 h-4 shrink-0" />
            : <AlertCircle className="w-4 h-4 shrink-0" />
          }
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-800">Integrações</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Conecte suas contas de e-mail para leitura e análise automática com IA.
          Nenhuma mensagem é enviada ou excluída automaticamente.
        </p>
      </div>

      {/* Aviso de segurança */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <strong>Leitura apenas.</strong> O sistema acessa somente a leitura dos seus e-mails.
          Nenhuma mensagem é enviada, respondida, movida ou excluída automaticamente.
          Toda ação depende de sua aprovação.
        </div>
      </div>

      {/* Cards de integração */}
      {(["OUTLOOK", "GMAIL"] as const).map((provider) => {
        const meta = PROVIDER_META[provider]
        const account = provider === "OUTLOOK" ? connectedOutlook : connectedGmail
        const isConfigured = provider === "OUTLOOK" ? config.outlookConfigured : config.gmailConfigured
        const isSyncing = account ? syncing === account.id : false
        const lastResult = account && syncResult?.accountId === account.id ? syncResult : null

        return (
          <Card key={provider} className={cn("overflow-hidden", account && "border-slate-300")}>
            {/* Faixa de cor no topo */}
            <div className={cn("h-1 bg-gradient-to-r", meta.color)} />

            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{meta.icon}</span>
                <div>
                  <CardTitle className="text-base">{meta.label}</CardTitle>
                  {account ? (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      <p className="text-xs text-green-700 font-medium">Conectado como {account.email}</p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-slate-300" />
                      <p className="text-xs text-slate-500">Não conectado</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {account ? (
                  <>
                    <Button
                      size="sm"
                      onClick={() => syncEmails(account.id)}
                      disabled={isSyncing}
                      className={cn("bg-gradient-to-r text-white", meta.color)}
                    >
                      {isSyncing
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <RefreshCw className="w-3.5 h-3.5" />
                      }
                      {isSyncing ? "Sincronizando..." : "Sincronizar e-mails"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => disconnect(account.id)}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Desconectar
                    </Button>
                  </>
                ) : (
                  <a href={isConfigured ? meta.authPath : undefined}>
                    <Button
                      size="sm"
                      disabled={!isConfigured}
                      className={cn("bg-gradient-to-r text-white disabled:opacity-40", meta.color)}
                      onClick={!isConfigured ? undefined : undefined}
                    >
                      <PlugZap className="w-3.5 h-3.5" />
                      Conectar {provider === "OUTLOOK" ? "Outlook" : "Gmail"}
                    </Button>
                  </a>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Não configurado */}
              {!isConfigured && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-amber-800 mb-1">
                    Credenciais não configuradas
                  </p>
                  <p className="text-xs text-amber-700 mb-3">
                    Para conectar o {meta.label}, você precisa registrar um aplicativo OAuth
                    e adicionar as variáveis ao arquivo <code className="bg-amber-100 px-1 rounded">.env</code>:
                  </p>
                  {provider === "OUTLOOK" ? (
                    <div className="font-mono text-xs bg-amber-100 rounded-lg p-3 space-y-0.5 text-amber-900">
                      <div>MICROSOFT_CLIENT_ID=<span className="text-amber-500">seu-client-id</span></div>
                      <div>MICROSOFT_CLIENT_SECRET=<span className="text-amber-500">seu-client-secret</span></div>
                      <div>MICROSOFT_TENANT_ID=common</div>
                      <div>MICROSOFT_REDIRECT_URI=http://localhost:3000/api/auth/outlook/callback</div>
                    </div>
                  ) : (
                    <div className="font-mono text-xs bg-amber-100 rounded-lg p-3 space-y-0.5 text-amber-900">
                      <div>GOOGLE_CLIENT_ID=<span className="text-amber-500">seu-client-id</span></div>
                      <div>GOOGLE_CLIENT_SECRET=<span className="text-amber-500">seu-client-secret</span></div>
                      <div>GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/gmail/callback</div>
                    </div>
                  )}
                  <a
                    href={meta.setupUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 font-medium mt-3 underline underline-offset-2"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Registrar aplicativo em {meta.setupLabel}
                  </a>
                  <p className="text-xs text-amber-600 mt-2">
                    Escopos necessários: <code className="bg-amber-100 px-1 rounded">{meta.scopes.join(", ")}</code>
                  </p>
                </div>
              )}

              {/* Conta conectada */}
              {account && (
                <>
                  {/* Estatísticas */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-slate-800">{account._count.inboxItems}</p>
                      <p className="text-xs text-slate-500 mt-0.5">E-mails importados</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                      <p className="text-xs font-medium text-slate-700">Conectado em</p>
                      <p className="text-xs text-slate-500 mt-0.5">{formatDateTime(account.connectedAt)}</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                      <p className="text-xs font-medium text-slate-700">Última sync</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {account.lastSyncAt ? formatDateTime(account.lastSyncAt) : "Nunca"}
                      </p>
                    </div>
                  </div>

                  {/* Resultado da última sincronização */}
                  {lastResult && (
                    <div className={cn(
                      "rounded-lg border p-3 flex items-start gap-2",
                      lastResult.errors.length
                        ? "bg-red-50 border-red-200"
                        : "bg-green-50 border-green-200"
                    )}>
                      {lastResult.errors.length
                        ? <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        : <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                      }
                      <div className="text-xs">
                        <p className={lastResult.errors.length ? "text-red-800 font-medium" : "text-green-800 font-medium"}>
                          {lastResult.totalNew} novo(s) e-mail(s) importado(s) · {lastResult.totalSkipped} já existente(s)
                        </p>
                        {lastResult.errors.map((e, i) => (
                          <p key={i} className="text-red-700 mt-0.5">{e}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pastas / Labels */}
                  <div>
                    <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                      <Folder className="w-4 h-4 text-slate-400" />
                      {provider === "GMAIL" ? "Labels" : "Pastas"} para sincronização
                    </p>
                    <p className="text-xs text-slate-500 mb-3">
                      Selecione quais pastas serão incluídas na sincronização manual.
                    </p>

                    {account.folders.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Nenhuma pasta encontrada. Tente sincronizar novamente.</p>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {account.folders.map((folder) => (
                          <button
                            key={folder.id}
                            onClick={() => toggleFolder(folder.id, folder.isSelected)}
                            className={cn(
                              "flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left text-xs transition-all",
                              folder.isSelected
                                ? "border-blue-400 bg-blue-50 text-blue-800"
                                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                            )}
                          >
                            {folder.isSelected
                              ? <FolderOpen className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              : <Folder className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            }
                            <span className="truncate font-medium">{folder.name}</span>
                            {folder.unreadCount != null && folder.unreadCount > 0 && (
                              <span className="ml-auto bg-blue-600 text-white text-[10px] font-bold rounded-full px-1.5 shrink-0">
                                {folder.unreadCount}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )
      })}

      {/* Instruções gerais */}
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="p-5">
          <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <Info className="w-4 h-4 text-slate-400" />
            Como funciona a sincronização
          </h3>
          <ol className="space-y-2 text-sm text-slate-600">
            {[
              "Conecte sua conta de e-mail via OAuth — o sistema obtém apenas permissão de leitura.",
              "Selecione as pastas/labels que deseja monitorar.",
              'Clique em "Sincronizar e-mails" para importar até 25 e-mails recentes.',
              "Os agentes de IA analisam cada e-mail e sugerem tarefas, prioridades e respostas.",
              'Acesse a "Caixa de Entrada" para revisar os e-mails e criar tarefas com um clique.',
              "Nenhuma ação é tomada automaticamente — toda decisão é sua.",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
