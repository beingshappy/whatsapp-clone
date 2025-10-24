"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { X, AlertCircle, Users, Shield } from "lucide-react"

interface AdminDashboardProps {
  isOpen: boolean
  onClose: () => void
  isAdmin: boolean
}

interface Report {
  id: string
  messageId: string
  reportedBy: string
  reason: string
  timestamp: number
  status: "pending" | "reviewed" | "resolved"
}

interface BlockedUser {
  id: string
  userId: string
  reason: string
  blockedAt: number
}

export default function AdminDashboard({ isOpen, onClose, isAdmin }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<"reports" | "blocked" | "users">("reports")
  const [reports, setReports] = useState<Report[]>([
    {
      id: "1",
      messageId: "msg1",
      reportedBy: "user1",
      reason: "Inappropriate content",
      timestamp: Date.now() - 3600000,
      status: "pending",
    },
  ])
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([])

  if (!isOpen || !isAdmin) return null

  const handleResolveReport = (reportId: string) => {
    setReports(reports.map((r) => (r.id === reportId ? { ...r, status: "resolved" } : r)))
  }

  const handleUnblockUser = (userId: string) => {
    setBlockedUsers(blockedUsers.filter((u) => u.userId !== userId))
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg shadow-lg w-full max-w-2xl max-h-96 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 p-4 border-b border-border bg-card flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">Admin Dashboard</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border bg-muted/50">
          <button
            onClick={() => setActiveTab("reports")}
            className={`flex-1 px-4 py-3 font-medium text-sm transition-colors ${
              activeTab === "reports"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Reports
            </div>
          </button>
          <button
            onClick={() => setActiveTab("blocked")}
            className={`flex-1 px-4 py-3 font-medium text-sm transition-colors ${
              activeTab === "blocked"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Shield className="w-4 h-4" />
              Blocked Users
            </div>
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`flex-1 px-4 py-3 font-medium text-sm transition-colors ${
              activeTab === "users"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Users className="w-4 h-4" />
              Users
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {activeTab === "reports" && (
            <div className="space-y-3">
              {reports.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No reports</p>
              ) : (
                reports.map((report) => (
                  <div key={report.id} className="p-3 bg-muted rounded-lg border border-border">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-foreground">Report #{report.id}</span>
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              report.status === "pending"
                                ? "bg-yellow-500/20 text-yellow-700"
                                : report.status === "reviewed"
                                  ? "bg-blue-500/20 text-blue-700"
                                  : "bg-green-500/20 text-green-700"
                            }`}
                          >
                            {report.status}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">Reason: {report.reason}</p>
                        <p className="text-xs text-muted-foreground">
                          Reported by: {report.reportedBy} • {new Date(report.timestamp).toLocaleString()}
                        </p>
                      </div>
                      {report.status !== "resolved" && (
                        <Button size="sm" onClick={() => handleResolveReport(report.id)} className="whitespace-nowrap">
                          Resolve
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "blocked" && (
            <div className="space-y-3">
              {blockedUsers.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No blocked users</p>
              ) : (
                blockedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="p-3 bg-muted rounded-lg border border-border flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">{user.userId}</p>
                      <p className="text-xs text-muted-foreground">Reason: {user.reason}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handleUnblockUser(user.userId)}>
                      Unblock
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "users" && (
            <div className="space-y-3">
              <div className="p-3 bg-muted rounded-lg border border-border">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Users</p>
                    <p className="text-2xl font-bold text-foreground">1,234</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Active Today</p>
                    <p className="text-2xl font-bold text-foreground">567</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Blocked Users</p>
                    <p className="text-2xl font-bold text-foreground">{blockedUsers.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Pending Reports</p>
                    <p className="text-2xl font-bold text-foreground">
                      {reports.filter((r) => r.status === "pending").length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
