import React, { useState, useEffect } from 'react';
import { 
  Send, Calendar, Clock, AlertCircle, CheckCircle, RefreshCw, 
  Trash2, Pause, Play, XCircle, Sparkles, Bell, Users, Zap, Info, ChevronRight, Eye
} from 'lucide-react';
import { API_BASE } from '../../config/api';
import { formatAppDateTime } from '../../utils/dateUtils';

const QUICK_TEMPLATES = [
  {
    name: '🎉 Festival Special',
    title: '🎉 Festival Feast Offer!',
    body: 'Enjoy special festive discounts up to 50% off on your favorite restaurants!',
    targetAudience: 'customer',
    link: '/restaurants'
  },
  {
    name: '🍛 Today\'s Special',
    title: '🍛 Today\'s Special Menu!',
    body: 'Check out top biryani and food deals fresh from local kitchens in your city.',
    targetAudience: 'customer',
    link: '/restaurants'
  },
  {
    name: '🎁 Special Offer',
    title: '🎁 Flash Discount Alert!',
    body: 'Order now and get free delivery on orders above ₹199!',
    targetAudience: 'customer',
    link: '/cart'
  },
  {
    name: '📢 Announcement',
    title: '📢 Jinkzo Platform Update',
    body: 'We have updated our app with faster delivery times and new store categories!',
    targetAudience: 'all',
    link: '/'
  }
];

export default function NotificationCampaignsTab({ token }) {
  const [campaigns, setCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Selected campaign for viewing logs
  const [selectedCampaignForLogs, setSelectedCampaignForLogs] = useState(null);

  // Form State
  const [form, setForm] = useState({
    title: '',
    body: '',
    targetAudience: 'customer',
    topic: '',
    imageUrl: '',
    link: '/restaurants',
    scheduleType: 'SEND_NOW', // SEND_NOW | SCHEDULE_ONCE | REPEATING
    scheduledAtDate: '', // datetime-local format
    repeatFrequency: 'DAILY', // DAILY | WEEKLY | HOURLY_WINDOW
    repeatTime: '10:00', // HH:mm IST
    repeatDays: [0, 1, 2, 3, 4, 5, 6], // Sun-Sat
    repeatIntervalHours: 3,
    windowStartTime: '09:00',
    windowEndTime: '21:00'
  });

  const fetchCampaigns = async () => {
    try {
      setIsLoading(true);
      setErrorMsg('');
      const res = await fetch(`${API_BASE}/notifications/admin/campaigns`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch campaign list');
      setCampaigns(Array.isArray(data) ? data : (data.campaigns || []));
    } catch (err) {
      console.error('[NotificationCampaignsTab] Error fetching campaigns:', err);
      setErrorMsg(err.message || 'Could not load campaigns');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchCampaigns();
  }, [token]);

  const applyTemplate = (tpl) => {
    setForm(prev => ({
      ...prev,
      title: tpl.title,
      body: tpl.body,
      targetAudience: tpl.targetAudience,
      link: tpl.link || '/restaurants'
    }));
    setSuccessMsg(`Applied template: "${tpl.name}"`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleCreateCampaign = async (sendImmediately = false) => {
    if (!form.title.trim() || !form.body.trim()) {
      setErrorMsg('Please enter both Title and Body for the notification.');
      return;
    }

    if (!sendImmediately && form.scheduleType === 'SCHEDULE_ONCE' && !form.scheduledAtDate) {
      setErrorMsg('Please select a scheduled date and time.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');
      setSuccessMsg('');

      const frequencyMap = {
        'DAILY': 'daily',
        'WEEKLY': 'weekly',
        'HOURLY_WINDOW': 'every_n_hours'
      };

      const mode = sendImmediately
        ? 'now'
        : form.scheduleType === 'SCHEDULE_ONCE'
          ? 'schedule_once'
          : form.scheduleType === 'REPEATING'
            ? 'repeat'
            : 'now';

      let windowStartHour = 9;
      let windowEndHour = 21;

      if (form.repeatFrequency === 'DAILY' || form.repeatFrequency === 'WEEKLY') {
        if (form.repeatTime) {
          const parsedHour = parseInt(form.repeatTime.split(':')[0], 10);
          if (!isNaN(parsedHour)) {
            windowStartHour = parsedHour;
          }
        }
      } else if (form.repeatFrequency === 'HOURLY_WINDOW') {
        if (form.windowStartTime) {
          const parsedStart = parseInt(form.windowStartTime.split(':')[0], 10);
          if (!isNaN(parsedStart)) windowStartHour = parsedStart;
        }
        if (form.windowEndTime) {
          const parsedEnd = parseInt(form.windowEndTime.split(':')[0], 10);
          if (!isNaN(parsedEnd)) windowEndHour = parsedEnd;
        }
      }

      const repeatConfig = (!sendImmediately && form.scheduleType === 'REPEATING') ? {
        frequency: frequencyMap[form.repeatFrequency] || 'daily',
        intervalHours: Number(form.repeatIntervalHours) || 3,
        windowStartHour,
        windowEndHour,
        daysOfWeek: form.repeatDays
      } : undefined;

      const payload = {
        title: form.title.trim(),
        message: form.body.trim(),
        targetAudience: form.targetAudience,
        topic: form.topic.trim() || undefined,
        imageUrl: form.imageUrl.trim() || undefined,
        link: form.link.trim() || undefined,
        mode,
        scheduleType: sendImmediately ? 'SEND_NOW' : form.scheduleType,
        sendNow: sendImmediately,
        scheduledAt: (!sendImmediately && form.scheduleType === 'SCHEDULE_ONCE' && form.scheduledAtDate)
          ? new Date(form.scheduledAtDate).toISOString()
          : undefined,
        repeatConfig
      };

      const res = await fetch(`${API_BASE}/notifications/admin/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Failed to create campaign');

      if (data.campaign?.status === 'COMPLETED') {
        setSuccessMsg('Campaign created and sent successfully!');
      } else if (sendImmediately || data.campaign?.status === 'RUNNING') {
        setSuccessMsg('Campaign created and queued for immediate dispatch!');
      } else {
        setSuccessMsg(`Campaign scheduled successfully (Status: ${data.campaign?.status || 'SCHEDULED'})`);
      }

      // Reset form
      setForm(prev => ({
        ...prev,
        title: '',
        body: '',
        scheduledAtDate: ''
      }));

      fetchCampaigns();
    } catch (err) {
      console.error('[NotificationCampaignsTab] Error creating campaign:', err);
      setErrorMsg(err.message || 'Failed to submit campaign');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAction = async (campaignId, action) => {
    try {
      setErrorMsg('');
      setSuccessMsg('');
      let url = `${API_BASE}/notifications/admin/campaigns/${campaignId}/${action}`;
      let method = 'PUT';
      
      if (action === 'delete') {
        url = `${API_BASE}/notifications/admin/campaigns/${campaignId}`;
        method = 'DELETE';
      }

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `Failed to ${action} campaign`);

      setSuccessMsg(data.message || `Campaign ${action} successful`);
      fetchCampaigns();
    } catch (err) {
      console.error(`[NotificationCampaignsTab] Error performing ${action}:`, err);
      setErrorMsg(err.message || `Failed to perform action`);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Completed</span>;
      case 'SCHEDULED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1"><Clock className="w-3 h-3" /> Scheduled</span>;
      case 'RUNNING':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center gap-1 animate-pulse"><Zap className="w-3 h-3" /> Running</span>;
      case 'PAUSED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1"><Pause className="w-3 h-3" /> Paused</span>;
      case 'CANCELLED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 flex items-center gap-1"><XCircle className="w-3 h-3" /> Cancelled</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-500/10 text-gray-600 border border-gray-500/20">{status}</span>;
    }
  };

  const toggleDayOfWeek = (dayIdx) => {
    setForm(prev => {
      const currentDays = [...prev.repeatDays];
      if (currentDays.includes(dayIdx)) {
        return { ...prev, repeatDays: currentDays.filter(d => d !== dayIdx) };
      } else {
        return { ...prev, repeatDays: [...currentDays, dayIdx].sort() };
      }
    });
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-primary p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Bell className="w-6 h-6 text-yellow-300" />
            <h2 className="text-xl font-black">Push Notification Campaigns</h2>
          </div>
          <p className="text-sm text-indigo-100 max-w-2xl">
            Create immediate announcements or automated repeating schedules (Daily, Weekly, Hourly) for customers, riders, and restaurants with IST timezone sync.
          </p>
        </div>
        <button
          onClick={fetchCampaigns}
          disabled={isLoading}
          className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 backdrop-blur-md cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Status
        </button>
      </div>

      {/* Notifications / Feedback Messages */}
      {errorMsg && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 rounded-2xl text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400 rounded-2xl text-xs font-bold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Campaign Builder & Form */}
      <div className="bg-surface border border-line rounded-3xl p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="font-extrabold text-base text-main">Create & Schedule New Campaign</h3>
          </div>
        </div>

        {/* Quick Templates Selector */}
        <div>
          <label className="block text-xs font-extrabold text-muted uppercase tracking-wider mb-2">
            ⚡ Quick Start Templates
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {QUICK_TEMPLATES.map((tpl, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => applyTemplate(tpl)}
                className="p-3 bg-base hover:bg-primary/10 border border-line hover:border-primary/40 rounded-2xl text-left transition-all cursor-pointer group"
              >
                <div className="font-bold text-xs text-main group-hover:text-primary mb-1">
                  {tpl.name}
                </div>
                <div className="text-[11px] text-muted line-clamp-1">
                  {tpl.title}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Notification Title & Body */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-extrabold text-main mb-1">
                Campaign Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g., 🎉 Weekend Biryani Feast!"
                className="w-full p-3 rounded-2xl bg-base border border-line text-xs font-bold text-main focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-main mb-1">
                Notification Body <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder="e.g., Get 30% off on all top-rated restaurants near you. Use code WEEKEND30."
                className="w-full p-3 rounded-2xl bg-base border border-line text-xs font-medium text-main focus:outline-none focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-extrabold text-main mb-1">
                  Target Audience
                </label>
                <select
                  value={form.targetAudience}
                  onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
                  className="w-full p-3 rounded-2xl bg-base border border-line text-xs font-bold text-main focus:outline-none focus:border-primary"
                >
                  <option value="customer">👥 Customers</option>
                  <option value="restaurant">🏪 Restaurant Partners</option>
                  <option value="delivery">🛵 Delivery Riders</option>
                  <option value="all">🌐 All Platform Users</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-main mb-1">
                  App Route / Link
                </label>
                <input
                  type="text"
                  value={form.link}
                  onChange={(e) => setForm({ ...form, link: e.target.value })}
                  placeholder="/restaurants or /cart"
                  className="w-full p-3 rounded-2xl bg-base border border-line text-xs font-bold text-main focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-main mb-1">
                Image URL (Optional Banner)
              </label>
              <input
                type="text"
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                placeholder="https://api.jinkzo.com/uploads/banner.jpg"
                className="w-full p-3 rounded-2xl bg-base border border-line text-xs font-medium text-main focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Schedule Engine Controls */}
          <div className="space-y-4 bg-base/50 p-4 rounded-2xl border border-line">
            <label className="block text-xs font-extrabold text-main uppercase tracking-wider">
              📅 Execution Schedule Strategy
            </label>

            {/* Schedule Type Segmented Buttons */}
            <div className="grid grid-cols-3 gap-2 p-1 bg-base rounded-2xl border border-line">
              {[
                { id: 'SEND_NOW', label: '🚀 Send Now' },
                { id: 'SCHEDULE_ONCE', label: '⏰ One-time' },
                { id: 'REPEATING', label: '🔄 Repeating' }
              ].map(st => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setForm({ ...form, scheduleType: st.id })}
                  className={`py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    form.scheduleType === st.id
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-muted hover:text-main'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            {/* Configs based on Schedule Type */}
            {form.scheduleType === 'SCHEDULE_ONCE' && (
              <div className="p-3 bg-surface rounded-2xl border border-line space-y-2">
                <label className="block text-xs font-bold text-main">
                  Select Date & Time (Asia/Kolkata IST)
                </label>
                <input
                  type="datetime-local"
                  value={form.scheduledAtDate}
                  onChange={(e) => setForm({ ...form, scheduledAtDate: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-base border border-line text-xs font-bold text-main focus:outline-none focus:border-primary"
                />
              </div>
            )}

            {form.scheduleType === 'REPEATING' && (
              <div className="p-3 bg-surface rounded-2xl border border-line space-y-3">
                <div>
                  <label className="block text-xs font-bold text-main mb-1">
                    Frequency
                  </label>
                  <select
                    value={form.repeatFrequency}
                    onChange={(e) => setForm({ ...form, repeatFrequency: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-base border border-line text-xs font-bold text-main focus:outline-none focus:border-primary"
                  >
                    <option value="DAILY">Daily (Once every day)</option>
                    <option value="WEEKLY">Weekly (Specific Days)</option>
                    <option value="HOURLY_WINDOW">Hourly Window (e.g. Every 3 hrs between 09:00 - 21:00)</option>
                  </select>
                </div>

                {(form.repeatFrequency === 'DAILY' || form.repeatFrequency === 'WEEKLY') && (
                  <div>
                    <label className="block text-xs font-bold text-main mb-1">
                      Execution Time (IST)
                    </label>
                    <input
                      type="time"
                      value={form.repeatTime}
                      onChange={(e) => setForm({ ...form, repeatTime: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-base border border-line text-xs font-bold text-main focus:outline-none focus:border-primary"
                    />
                  </div>
                )}

                {form.repeatFrequency === 'WEEKLY' && (
                  <div>
                    <label className="block text-xs font-bold text-main mb-1">
                      Select Active Days
                    </label>
                    <div className="flex gap-1 justify-between">
                      {dayNames.map((name, idx) => {
                        const active = form.repeatDays.includes(idx);
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => toggleDayOfWeek(idx)}
                            className={`w-9 h-9 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              active
                                ? 'bg-primary text-white'
                                : 'bg-base text-muted hover:text-main border border-line'
                            }`}
                          >
                            {name[0]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {form.repeatFrequency === 'HOURLY_WINDOW' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-main mb-1">
                        Interval (Hours)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="12"
                        value={form.repeatIntervalHours}
                        onChange={(e) => setForm({ ...form, repeatIntervalHours: e.target.value })}
                        className="w-full p-2 rounded-xl bg-base border border-line text-xs font-bold text-main focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-main mb-1">Start Window</label>
                        <input
                          type="time"
                          value={form.windowStartTime}
                          onChange={(e) => setForm({ ...form, windowStartTime: e.target.value })}
                          className="w-full p-2 rounded-xl bg-base border border-line text-xs font-bold text-main"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-main mb-1">End Window</label>
                        <input
                          type="time"
                          value={form.windowEndTime}
                          onChange={(e) => setForm({ ...form, windowEndTime: e.target.value })}
                          className="w-full p-2 rounded-xl bg-base border border-line text-xs font-bold text-main"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Info notice */}
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-[11px] text-blue-600 dark:text-blue-400 flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                All scheduled campaigns run in Asia/Kolkata timezone with atomic MongoDB locks to prevent duplicate execution across server restarts.
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleCreateCampaign(true)}
            className="px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            Send Now (Bypass Schedule)
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleCreateCampaign(false)}
            className="px-6 py-2.5 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-xs transition-all flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
          >
            {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
            {form.scheduleType === 'SEND_NOW' ? 'Dispatch Campaign' : 'Save & Activate Schedule'}
          </button>
        </div>
      </div>

      {/* Campaign Management Table */}
      <div className="bg-surface border border-line rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <h3 className="font-extrabold text-base text-main">Campaign History & Active Schedules</h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-primary/10 text-primary">
              {campaigns.length}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs font-bold text-muted flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Loading campaigns...
          </div>
        ) : campaigns.length === 0 ? (
          <div className="p-8 text-center text-xs font-medium text-muted bg-base/50 rounded-2xl border border-line">
            No notification campaigns found. Create your first campaign above!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-base border-b border-line text-muted uppercase tracking-wider font-extrabold text-[10px]">
                <tr>
                  <th className="p-3 rounded-l-2xl">Campaign Title</th>
                  <th className="p-3">Audience</th>
                  <th className="p-3">Schedule</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Sent / Stats</th>
                  <th className="p-3 text-right rounded-r-2xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {campaigns.map((cmp) => (
                  <tr key={cmp._id} className="hover:bg-base/50 transition-all">
                    <td className="p-3">
                      <div className="font-bold text-main text-xs">{cmp.title}</div>
                      <div className="text-[11px] text-muted line-clamp-1">{cmp.message || cmp.body}</div>
                    </td>

                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-base border border-line text-main capitalize">
                        {cmp.targetAudience}
                      </span>
                    </td>

                    <td className="p-3">
                      <div className="font-bold text-main text-xs">{cmp.scheduleType}</div>
                      {cmp.scheduleType === 'SCHEDULE_ONCE' && cmp.scheduledAt && (
                        <div className="text-[10px] text-muted">{formatAppDateTime(cmp.scheduledAt)}</div>
                      )}
                      {cmp.scheduleType === 'REPEATING' && cmp.repeatConfig && (
                        <div className="text-[10px] text-muted">
                          {cmp.repeatConfig.frequency} @ {cmp.repeatConfig.time || `${cmp.repeatConfig.intervalHours}h`}
                        </div>
                      )}
                    </td>

                    <td className="p-3">
                      {getStatusBadge(cmp.status)}
                    </td>

                    <td className="p-3">
                      <div className="font-extrabold text-main">{cmp.totalSent || 0} sent</div>
                      {cmp.totalFailed > 0 && (
                        <div className="text-[10px] text-red-500">{cmp.totalFailed} failed</div>
                      )}
                    </td>

                    <td className="p-3 text-right space-x-1">
                      <button
                        title="View Logs"
                        onClick={() => setSelectedCampaignForLogs(cmp)}
                        className="p-2 rounded-xl bg-base hover:bg-primary/10 text-muted hover:text-primary transition-all cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {cmp.status === 'SCHEDULED' && (
                        <button
                          title="Pause Schedule"
                          onClick={() => handleAction(cmp._id, 'pause')}
                          className="p-2 rounded-xl bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 transition-all cursor-pointer"
                        >
                          <Pause className="w-4 h-4" />
                        </button>
                      )}

                      {cmp.status === 'PAUSED' && (
                        <button
                          title="Resume Schedule"
                          onClick={() => handleAction(cmp._id, 'resume')}
                          className="p-2 rounded-xl bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-all cursor-pointer"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      )}

                      {['SCHEDULED', 'PAUSED'].includes(cmp.status) && (
                        <button
                          title="Send Now"
                          onClick={() => handleAction(cmp._id, 'send-now')}
                          className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-all cursor-pointer"
                        >
                          <Zap className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        title="Delete Campaign"
                        onClick={() => handleAction(cmp._id, 'delete')}
                        className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Execution Logs Modal */}
      {selectedCampaignForLogs && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-surface border border-line rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="font-extrabold text-base text-main flex items-center gap-2">
                  <Eye className="w-5 h-5 text-primary" />
                  Campaign Logs: {selectedCampaignForLogs.title}
                </h3>
                <p className="text-xs text-muted">ID: {selectedCampaignForLogs._id}</p>
              </div>
              <button
                onClick={() => setSelectedCampaignForLogs(null)}
                className="p-2 rounded-xl hover:bg-base text-muted hover:text-main transition-all cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-3">
              {(!selectedCampaignForLogs.executionLogs || selectedCampaignForLogs.executionLogs.length === 0) ? (
                <div className="p-6 text-center text-xs text-muted font-medium bg-base/50 rounded-2xl border border-line">
                  No execution logs recorded yet.
                </div>
              ) : (
                selectedCampaignForLogs.executionLogs.map((log, idx) => (
                  <div key={idx} className="p-3 bg-base rounded-2xl border border-line text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`font-bold text-[11px] px-2 py-0.5 rounded-md ${
                        log.status === 'SUCCESS' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'
                      }`}>
                        {log.status}
                      </span>
                      <span className="text-[10px] text-muted">{formatAppDateTime(log.executedAt)}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] text-main font-semibold">
                      <div>Recipients: {log.recipientsCount || 0}</div>
                      <div className="text-green-600">Success: {log.successCount || 0}</div>
                      <div className="text-red-500">Failed: {log.failureCount || 0}</div>
                    </div>
                    {log.errorMessage && (
                      <div className="text-[10px] text-red-500 bg-red-500/5 p-2 rounded-xl border border-red-500/10 mt-1">
                        Error: {log.errorMessage}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-line pt-3 flex justify-end">
              <button
                onClick={() => setSelectedCampaignForLogs(null)}
                className="px-4 py-2 bg-base hover:bg-line text-main font-bold text-xs rounded-xl cursor-pointer"
              >
                Close Logs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
