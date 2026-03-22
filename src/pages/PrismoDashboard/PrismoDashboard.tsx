import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  CheckCircle,
  FileText,
  Clock,
  Users,
  Package,
  TrendingUp,
} from "lucide-react";
import eventService from "../../services/event.service";
import calendarService from "../../services/calendar.service";
import { getAllBundles } from "../../services/bundles.service";
import type { AdminEvent, EventStats, EventStatus } from "../../types/event.types";
import "./PrismoDashboard.css";
import type { CalendarStats } from "../../types/calendar.types";

const STATUS_COLORS: Record<EventStatus, string> = {
  draft: "#6b7280",
  published: "#10b981",
  ongoing: "#3b82f6",
  completed: "#8b5cf6",
  cancelled: "#ef4444",
};

const ACCENT_PURPLE = "#7c3aed";

const PrismoDashboard: React.FC = () => {
  const navigate = useNavigate();

  const [eventStats, setEventStats] = useState<EventStats | null>(null);
  const [recentEvents, setRecentEvents] = useState<AdminEvent[]>([]);
  const [calendarStats, setCalendarStats] = useState<CalendarStats | null>(null);
  const [bundleCount, setBundleCount] = useState<number | null>(null);
  const [upcomingCount, setUpcomingCount] = useState<number>(0);

  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const newErrors: Record<string, string> = {};

      // Fire all requests in parallel
      const [statsResult, eventsResult, calStatsResult, bundlesResult] =
        await Promise.allSettled([
          eventService.getEventStats(),
          eventService.searchEvents({ take: 5 }),
          calendarService.getCalendarStats(),
          getAllBundles("prismo"),
        ]);

      if (statsResult.status === "fulfilled") {
        setEventStats(statsResult.value);
      } else {
        newErrors.stats = "Failed to load event stats";
      }

      if (eventsResult.status === "fulfilled") {
        const events = eventsResult.value.events;
        setRecentEvents(events);
        // Count upcoming events (startDateTime > now)
        const now = new Date().toISOString();
        const upcoming = events.filter((e) => e.startDateTime > now);
        setUpcomingCount(upcoming.length);
      } else {
        newErrors.events = "Failed to load recent events";
      }

      if (calStatsResult.status === "fulfilled") {
        setCalendarStats(calStatsResult.value);
      } else {
        newErrors.calendar = "Failed to load calendar stats";
      }

      if (bundlesResult.status === "fulfilled") {
        setBundleCount(bundlesResult.value.length);
      } else {
        newErrors.bundles = "Failed to load bundle data";
      }

      setErrors(newErrors);
      setLoading(false);
    };

    loadData();
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div className="prismo-dashboard-spinner" />
          <p style={{ color: "#6b7280", marginTop: 16, fontSize: 15 }}>
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  const statsCards = [
    {
      label: "Total Events",
      value: eventStats?.total ?? "--",
      icon: <Calendar size={22} color="#fff" />,
      accent: ACCENT_PURPLE,
    },
    {
      label: "Published",
      value: eventStats?.published ?? "--",
      icon: <CheckCircle size={22} color="#fff" />,
      accent: "#10b981",
    },
    {
      label: "Draft",
      value: eventStats?.draft ?? "--",
      icon: <FileText size={22} color="#fff" />,
      accent: "#6b7280",
    },
    {
      label: "Upcoming",
      value: upcomingCount,
      icon: <Clock size={22} color="#fff" />,
      accent: "#3b82f6",
    },
  ];

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Dashboard</h1>
          <p style={styles.subtitle}>Welcome back. Here&apos;s what&apos;s happening with your events.</p>
        </div>
      </div>

      {/* Stats Cards */}
      {errors.stats ? (
        <div style={styles.errorBanner}>{errors.stats}</div>
      ) : (
        <div style={styles.statsRow}>
          {statsCards.map((card) => (
            <div key={card.label} style={styles.statsCard}>
              <div style={{ ...styles.statsIconBg, backgroundColor: card.accent }}>
                {card.icon}
              </div>
              <div style={styles.statsInfo}>
                <span style={styles.statsValue}>{card.value}</span>
                <span style={styles.statsLabel}>{card.label}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Middle Section: Two Columns */}
      <div style={styles.middleRow}>
        {/* Left Column: Recent Events */}
        <div style={styles.leftColumn}>
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h2 style={styles.cardTitle}>Recent Events</h2>
              <button
                style={styles.viewAllBtn}
                onClick={() => navigate("/prismo/events")}
              >
                View all
              </button>
            </div>

            {errors.events ? (
              <div style={styles.errorBanner}>{errors.events}</div>
            ) : recentEvents.length === 0 ? (
              <p style={styles.emptyText}>No events found</p>
            ) : (
              <table style={styles.table} className="prismo-dashboard-table">
                <thead>
                  <tr>
                    <th style={styles.th}>Event</th>
                    <th style={styles.th}>Owner</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentEvents.map((event) => (
                    <tr
                      key={event.id}
                      style={styles.tableRow}
                      onClick={() => navigate("/prismo/events")}
                    >
                      <td style={styles.td}>
                        <div style={styles.eventNameCell}>
                          {event.eventImage ? (
                            <img
                              src={event.eventImage}
                              alt={event.name}
                              style={styles.thumbnail}
                            />
                          ) : (
                            <div style={styles.thumbnailPlaceholder}>
                              <Calendar size={16} color="#9ca3af" />
                            </div>
                          )}
                          <span style={styles.eventName}>{event.name}</span>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.ownerName}>{event.ownerName}</span>
                      </td>
                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.statusBadge,
                            backgroundColor: STATUS_COLORS[event.status],
                          }}
                        >
                          {event.status}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.dateText}>
                          {formatDate(event.startDateTime)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Column: Quick Stats */}
        <div style={styles.rightColumn}>
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h2 style={styles.cardTitle}>Quick Stats</h2>
            </div>

            <div style={styles.quickStatsList}>
              {/* Calendar Stats */}
              {errors.calendar ? (
                <div style={styles.errorBannerSmall}>{errors.calendar}</div>
              ) : calendarStats ? (
                <>
                  <div style={styles.quickStatItem}>
                    <div style={styles.quickStatLeft}>
                      <div
                        style={{
                          ...styles.quickStatIcon,
                          backgroundColor: "#ede9fe",
                        }}
                      >
                        <Calendar size={16} color={ACCENT_PURPLE} />
                      </div>
                      <span style={styles.quickStatLabel}>Total Calendars</span>
                    </div>
                    <span style={styles.quickStatValue}>
                      {calendarStats.total}
                    </span>
                  </div>
                  <div style={styles.quickStatItem}>
                    <div style={styles.quickStatLeft}>
                      <div
                        style={{
                          ...styles.quickStatIcon,
                          backgroundColor: "#dbeafe",
                        }}
                      >
                        <Users size={16} color="#3b82f6" />
                      </div>
                      <span style={styles.quickStatLabel}>
                        Total Subscribers
                      </span>
                    </div>
                    <span style={styles.quickStatValue}>
                      {calendarStats.totalSubscribers}
                    </span>
                  </div>
                  <div style={styles.quickStatItem}>
                    <div style={styles.quickStatLeft}>
                      <div
                        style={{
                          ...styles.quickStatIcon,
                          backgroundColor: "#d1fae5",
                        }}
                      >
                        <TrendingUp size={16} color="#10b981" />
                      </div>
                      <span style={styles.quickStatLabel}>
                        Public Calendars
                      </span>
                    </div>
                    <span style={styles.quickStatValue}>
                      {calendarStats.public}
                    </span>
                  </div>
                </>
              ) : null}

              {/* Divider */}
              {calendarStats && <div style={styles.divider} />}

              {/* Bundle Stats */}
              {errors.bundles ? (
                <div style={styles.errorBannerSmall}>{errors.bundles}</div>
              ) : bundleCount !== null ? (
                <div style={styles.quickStatItem}>
                  <div style={styles.quickStatLeft}>
                    <div
                      style={{
                        ...styles.quickStatIcon,
                        backgroundColor: "#fef3c7",
                      }}
                    >
                      <Package size={16} color="#f59e0b" />
                    </div>
                    <span style={styles.quickStatLabel}>Packages</span>
                  </div>
                  <span style={styles.quickStatValue}>{bundleCount}</span>
                </div>
              ) : null}

              {/* Bundles label update */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: "28px 32px",
    maxWidth: 1280,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 400,
  },
  header: {
    marginBottom: 28,
  },
  title: {
    fontSize: 26,
    fontWeight: 700,
    color: "#111827",
    margin: 0,
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    margin: "4px 0 0 0",
  },

  // Stats Cards
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 18,
    marginBottom: 28,
  },
  statsCard: {
    background: "#fff",
    borderRadius: 12,
    padding: "20px 22px",
    display: "flex",
    alignItems: "center",
    gap: 16,
    boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
    border: "1px solid #f3f4f6",
  },
  statsIconBg: {
    width: 44,
    height: 44,
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  statsInfo: {
    display: "flex",
    flexDirection: "column",
  },
  statsValue: {
    fontSize: 24,
    fontWeight: 700,
    color: "#111827",
    lineHeight: 1.2,
  },
  statsLabel: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 2,
  },

  // Middle Section
  middleRow: {
    display: "grid",
    gridTemplateColumns: "1fr 340px",
    gap: 22,
  },
  leftColumn: {},
  rightColumn: {},

  // Card
  card: {
    background: "#fff",
    borderRadius: 12,
    padding: "22px 24px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
    border: "1px solid #f3f4f6",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: "#111827",
    margin: 0,
  },
  viewAllBtn: {
    background: "none",
    border: "none",
    color: ACCENT_PURPLE,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    padding: "4px 8px",
    borderRadius: 6,
  },

  // Table
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
  },
  th: {
    textAlign: "left" as const,
    fontSize: 12,
    fontWeight: 600,
    color: "#9ca3af",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    padding: "8px 12px",
    borderBottom: "1px solid #f3f4f6",
  },
  td: {
    padding: "12px 12px",
    borderBottom: "1px solid #f9fafb",
    fontSize: 14,
    color: "#374151",
  },
  tableRow: {
    cursor: "pointer",
    transition: "background 0.15s",
  },
  eventNameCell: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  thumbnail: {
    width: 34,
    height: 34,
    borderRadius: 8,
    objectFit: "cover" as const,
    flexShrink: 0,
  },
  thumbnailPlaceholder: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  eventName: {
    fontWeight: 500,
    color: "#111827",
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: 220,
    display: "inline-block",
  },
  ownerName: {
    color: "#6b7280",
    fontSize: 13,
  },
  statusBadge: {
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 500,
    color: "#fff",
    textTransform: "capitalize" as const,
  },
  dateText: {
    color: "#6b7280",
    fontSize: 13,
    whiteSpace: "nowrap" as const,
  },

  // Quick Stats
  quickStatsList: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  quickStatItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  quickStatLeft: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  quickStatIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  quickStatLabel: {
    fontSize: 14,
    color: "#374151",
    fontWeight: 500,
  },
  quickStatValue: {
    fontSize: 18,
    fontWeight: 700,
    color: "#111827",
  },
  divider: {
    height: 1,
    backgroundColor: "#f3f4f6",
    margin: "2px 0",
  },

  // Error & Empty
  errorBanner: {
    backgroundColor: "#fef2f2",
    color: "#dc2626",
    padding: "12px 16px",
    borderRadius: 8,
    fontSize: 14,
    marginBottom: 16,
    border: "1px solid #fecaca",
  },
  errorBannerSmall: {
    backgroundColor: "#fef2f2",
    color: "#dc2626",
    padding: "8px 12px",
    borderRadius: 6,
    fontSize: 13,
    border: "1px solid #fecaca",
  },
  emptyText: {
    color: "#9ca3af",
    fontSize: 14,
    textAlign: "center" as const,
    padding: "32px 0",
  },
};

export default PrismoDashboard;
