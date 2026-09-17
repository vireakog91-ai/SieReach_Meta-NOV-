"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/telegram/Navbar";
import { DashboardOverviewTab } from "@/components/telegram/DashboardOverviewTab";
import { QueueAndHistoryTab } from "@/components/telegram/QueueAndHistoryTab";
import { ContentCalendarTab } from "@/components/telegram/ContentCalendarTab";
import { ChannelsManagerTab } from "@/components/telegram/ChannelsManagerTab";
import { TemplatesTab } from "@/components/telegram/TemplatesTab";
import { DeliveryLogsTab } from "@/components/telegram/DeliveryLogsTab";
import { SettingsTab } from "@/components/telegram/SettingsTab";
import { PostComposerModal } from "@/components/telegram/PostComposerModal";

export default function SieReachTelegramScheduler() {
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "queue" | "calendar" | "channels" | "templates" | "logs" | "settings"
  >("dashboard");

  // Data states
  const [posts, setPosts] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [bots, setBots] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    totalScheduled: 0,
    totalPublished: 0,
    totalFailed: 0,
    totalRecurring: 0,
    totalDrafts: 0,
    sentTodayCount: 0,
    totalSuccessLogs: 0,
    totalFailedLogs: 0,
    successRate: 100,
    totalChannels: 0,
    totalAudience: 0,
  });
  const [nextPost, setNextPost] = useState<any>(null);
  const [settings, setSettings] = useState<Record<string, string>>({
    sandbox_mode: "true",
    timezone: "Asia/Phnom_Penh",
  });

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<any>(null);
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // User session state
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    email: string;
    name: string;
    role: "ADMIN" | "CLIENT";
    avatarUrl?: string | null;
  } | null>(null);

  const showNotification = (message: string, type: "success" | "error" | "info" = "success") => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Fetch current user session
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.success && data.user) {
          setCurrentUser(data.user);
        }
      } catch {
        // Ignored
      }
    };
    fetchUser();
  }, []);

  // Prevent CLIENT role from opening Settings tab
  useEffect(() => {
    if (currentUser?.role === "CLIENT" && activeTab === "settings") {
      setActiveTab("dashboard");
    }
  }, [currentUser, activeTab]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  };

  // Fetch all platform data
  const fetchData = useCallback(async () => {
    try {
      const [postsRes, channelsRes, botsRes, templatesRes, analyticsRes, settingsRes] =
        await Promise.all([
          fetch("/api/telegram/posts"),
          fetch("/api/telegram/channels"),
          fetch("/api/telegram/bots"),
          fetch("/api/telegram/templates"),
          fetch("/api/telegram/analytics"),
          fetch("/api/telegram/settings"),
        ]);

      const [
        postsJson,
        channelsJson,
        botsJson,
        templatesJson,
        analyticsJson,
        settingsJson,
      ] = await Promise.all([
        postsRes.json(),
        channelsRes.json(),
        botsRes.json(),
        templatesRes.json(),
        analyticsRes.json(),
        settingsRes.json(),
      ]);

      if (postsJson.success) setPosts(postsJson.posts || []);
      if (channelsJson.success) setChannels(channelsJson.channels || []);
      if (botsJson.success) setBots(botsJson.bots || []);
      if (templatesJson.success) setTemplates(templatesJson.templates || []);
      if (settingsJson.success) setSettings(settingsJson.settings || {});

      if (analyticsJson.success) {
        setStats(analyticsJson.stats || {});
        setNextPost(analyticsJson.nextUpcomingPost || null);
        setLogs(analyticsJson.recentLogs || []);
      }
    } catch (err: any) {
      console.error("Error loading platform data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Automated background scheduler heartbeat: runs every 15s
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/telegram/cron", { method: "POST" });
        const data = await res.json();
        if (data.success && data.result?.processedCount > 0) {
          showNotification(
            `Automated Worker: Processed ${data.result.processedCount} scheduled post(s)!`,
            "info"
          );
          fetchData();
        }
      } catch {
        // Silent
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [fetchData]);

  // Handler: Save post (Create or Edit)
  const handleSavePost = async (postData: any) => {
    setIsSubmittingPost(true);
    try {
      const isEdit = Boolean(postData.id);
      const url = isEdit
        ? `/api/telegram/posts/${postData.id}`
        : "/api/telegram/posts";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postData),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to save post.");
      }

      showNotification(
        json.message ||
          (isEdit ? "Post updated successfully!" : "Post scheduled successfully!"),
        "success"
      );
      setIsComposerOpen(false);
      setEditingPost(null);
      await fetchData();
    } catch (err: any) {
      alert(err.message || "Error saving post.");
    } finally {
      setIsSubmittingPost(false);
    }
  };

  // Handler: Send Now
  const handleSendNow = async (id: string) => {
    try {
      const res = await fetch(`/api/telegram/posts/${id}/send-now`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.success) {
        showNotification(json.message || "Broadcast delivered successfully!", "success");
      } else {
        showNotification(json.message || "Delivery encountered errors.", "error");
      }
      await fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to broadcast post.");
    }
  };

  // Handler: Retry
  const handleRetry = async (id: string) => {
    try {
      const res = await fetch(`/api/telegram/posts/${id}/retry`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.success) {
        showNotification(json.message || "Retry broadcast delivered successfully!", "success");
      } else {
        showNotification(json.message || "Retry encountered errors.", "error");
      }
      await fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to retry post.");
    }
  };

  // Handler: Delete post
  const handleDeletePost = async (id: string) => {
    try {
      const res = await fetch(`/api/telegram/posts/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        showNotification("Post deleted.", "info");
        await fetchData();
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete post.");
    }
  };

  // Handler: Toggle Pause / Resume
  const handleTogglePause = async (post: any) => {
    try {
      const newStatus = post.status === "PAUSED" ? "SCHEDULED" : "PAUSED";
      const res = await fetch(`/api/telegram/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        showNotification(`Campaign ${newStatus === "PAUSED" ? "paused" : "resumed"}.`, "info");
        await fetchData();
      }
    } catch (err: any) {
      alert(err.message || "Failed to update status.");
    }
  };

  // Handler: Duplicate post
  const handleDuplicatePost = (post: any) => {
    setEditingPost({
      ...post,
      id: undefined,
      title: `${post.title} (Copy)`,
      status: "SCHEDULED",
    });
    setIsComposerOpen(true);
  };

  // Handler: Use template in composer
  const handleUseTemplate = (tmpl: any) => {
    setEditingPost({
      title: tmpl.title,
      content: tmpl.content,
      parseMode: tmpl.parseMode || "HTML",
      mediaType: tmpl.mediaType || "none",
      mediaUrl: tmpl.mediaUrl || null,
      inlineButtons: tmpl.inlineButtons || null,
    });
    setIsComposerOpen(true);
  };

  // Handler: Calendar click day to schedule
  const handleOpenNewPostWithDate = (date: Date) => {
    const future = new Date(date);
    future.setHours(9, 0, 0, 0);
    setEditingPost({
      scheduledAt: future.toISOString(),
    });
    setIsComposerOpen(true);
  };

  // Channels handlers
  const handleAddChannel = async (data: { chatId: string; title?: string; botId?: string }) => {
    const res = await fetch("/api/telegram/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!json.success) {
      const errorMsg = json.error || "Failed to add channel.";
      showNotification(errorMsg, "error");
      throw new Error(errorMsg);
    }
    showNotification("Telegram channel connected successfully!", "success");
    await fetchData();
  };

  const handleRefreshChannel = async (id: string) => {
    const res = await fetch("/api/telegram/channels", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const json = await res.json();
    if (json.success) {
      showNotification("Channel refreshed with latest data.", "success");
      await fetchData();
    }
  };

  const handleUpdateChannel = async (data: any) => {
    const res = await fetch("/api/telegram/channels", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!json.success) {
      showNotification(json.error || "Failed to update channel.", "error");
      throw new Error(json.error || "Failed to update channel.");
    }
    showNotification("Channel updated successfully!", "success");
    await fetchData();
  };

  const handleDeleteChannel = async (id: string) => {
    try {
      const res = await fetch(`/api/telegram/channels?id=${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        showNotification("Channel disconnected successfully.", "info");
        // Optimistically update local state immediately so user is never stuck
        setChannels((prev) => prev.filter((c) => c.id !== id));
        await fetchData();
      } else {
        showNotification(json.error || "Failed to disconnect channel.", "error");
        throw new Error(json.error || "Failed to disconnect channel.");
      }
    } catch (err: any) {
      showNotification(err.message || "Failed to disconnect channel.", "error");
      throw err;
    }
  };

  // Bots handlers
  const handleAddBot = async (botToken: string, name?: string) => {
    const res = await fetch("/api/telegram/bots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ botToken, name }),
    });
    const json = await res.json();
    if (!json.success) {
      const errorMsg = json.error || "Failed to connect bot.";
      showNotification(errorMsg, "error");
      throw new Error(errorMsg);
    }
    showNotification("Telegram Bot verified and connected!", "success");
    await fetchData();
  };

  const handleDeleteBot = async (id: string) => {
    const res = await fetch(`/api/telegram/bots?id=${id}`, {
      method: "DELETE",
    });
    const json = await res.json();
    if (json.success) {
      showNotification("Bot removed.", "info");
      await fetchData();
    }
  };

  // Settings handlers
  const handleUpdateSetting = async (key: string, value: string) => {
    const res = await fetch("/api/telegram/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: value }),
    });
    const json = await res.json();
    if (json.success) {
      setSettings((prev) => ({ ...prev, [key]: value }));
      showNotification("Settings updated.", "success");
    }
  };

  // Showcase Demo Seeding
  const handleSeedData = async () => {
    setIsSeeding(true);
    try {
      const res = await fetch("/api/telegram/seed", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        showNotification("Showcase demo data populated successfully!", "success");
        await fetchData();
      }
    } catch {
      alert("Failed to seed demo data.");
    } finally {
      setIsSeeding(false);
    }
  };

  const upcomingPosts = posts.filter(
    (p) => p.status === "SCHEDULED" && new Date(p.scheduledAt) >= new Date()
  );

  return (
    <div className="min-h-screen app-canvas flex flex-col font-sans selection:bg-blue-600 selection:text-white transition-colors duration-200">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 animate-bounce">
          <div
            className={`px-4 py-2.5 rounded-2xl text-xs font-semibold shadow-2xl flex items-center gap-2 border ${
              notification.type === "success"
                ? "bg-emerald-600 border-emerald-500 text-white shadow-emerald-500/20"
                : notification.type === "error"
                ? "bg-rose-600 border-rose-500 text-white shadow-rose-500/20"
                : "bg-blue-600 border-blue-500 text-white shadow-blue-500/20"
            }`}
          >
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Global Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewPost={() => {
          setEditingPost(null);
          setIsComposerOpen(true);
        }}
        isSandbox={settings["sandbox_mode"] === "true"}
        onToggleSandbox={() =>
          handleUpdateSetting(
            "sandbox_mode",
            settings["sandbox_mode"] === "true" ? "false" : "true"
          )
        }
        scheduledCount={stats.totalScheduled}
        failedCount={stats.totalFailed}
        user={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Tab Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "dashboard" && (
          <DashboardOverviewTab
            stats={stats}
            nextPost={nextPost}
            upcomingPosts={upcomingPosts}
            channels={channels}
            templates={templates}
            recentLogs={logs}
            onOpenNewPost={() => {
              setEditingPost(null);
              setIsComposerOpen(true);
            }}
            onNavigateToTab={(tab) => setActiveTab(tab as any)}
            onSendNow={handleSendNow}
            onUseTemplate={handleUseTemplate}
          />
        )}

        {activeTab === "queue" && (
          <QueueAndHistoryTab
            posts={posts}
            channels={channels}
            onSendNow={handleSendNow}
            onRetry={handleRetry}
            onEdit={(post) => {
              setEditingPost(post);
              setIsComposerOpen(true);
            }}
            onDelete={handleDeletePost}
            onTogglePause={handleTogglePause}
            onDuplicate={handleDuplicatePost}
            isLoading={isLoading}
            onRefresh={fetchData}
          />
        )}

        {activeTab === "calendar" && (
          <ContentCalendarTab
            posts={posts}
            onOpenNewPostWithDate={handleOpenNewPostWithDate}
            onSelectPost={(post) => {
              setEditingPost(post);
              setIsComposerOpen(true);
            }}
          />
        )}

        {activeTab === "channels" && (
          <ChannelsManagerTab
            channels={channels}
            bots={bots}
            onAddChannel={handleAddChannel}
            onUpdateChannel={handleUpdateChannel}
            onRefreshChannel={handleRefreshChannel}
            onDeleteChannel={handleDeleteChannel}
            isLoading={isLoading}
          />
        )}

        {activeTab === "templates" && (
          <TemplatesTab
            templates={templates}
            onUseTemplate={handleUseTemplate}
            onCreateTemplate={async (tmpl) => {
              const res = await fetch("/api/telegram/templates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(tmpl),
              });
              const json = await res.json();
              if (json.success) {
                showNotification("Template created successfully!", "success");
                await fetchData();
              }
            }}
            onDeleteTemplate={async (id) => {
              const res = await fetch(`/api/telegram/templates?id=${id}`, {
                method: "DELETE",
              });
              const json = await res.json();
              if (json.success) {
                showNotification("Template deleted.", "info");
                await fetchData();
              }
            }}
          />
        )}

        {activeTab === "logs" && (
          <DeliveryLogsTab
            logs={logs}
            onRetryPost={handleRetry}
            isLoading={isLoading}
            onRefresh={fetchData}
          />
        )}

        {activeTab === "settings" && (
          <SettingsTab
            bots={bots}
            settings={settings}
            onAddBot={handleAddBot}
            onDeleteBot={handleDeleteBot}
            onUpdateSetting={handleUpdateSetting}
            onSeedData={handleSeedData}
            isSeeding={isSeeding}
          />
        )}
      </main>

      {/* Post Composer Modal */}
      <PostComposerModal
        isOpen={isComposerOpen}
        onClose={() => {
          setIsComposerOpen(false);
          setEditingPost(null);
        }}
        channels={channels}
        templates={templates}
        initialPost={editingPost}
        onSave={handleSavePost}
        isSubmitting={isSubmittingPost}
      />
    </div>
  );
}
