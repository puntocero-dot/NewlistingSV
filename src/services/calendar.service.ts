import { google } from 'googleapis';

export class CalendarService {
  private oauth2Client;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    if (process.env.GOOGLE_REFRESH_TOKEN) {
      this.oauth2Client.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN
      });
    }
  }

  private isConfigured(): boolean {
    return !!process.env.GOOGLE_REFRESH_TOKEN;
  }

  async getAvailableSlots(calendarId: string = 'primary') {
    if (!this.isConfigured()) {
      return { available: false, reason: 'Calendar integration not configured', slots: [] };
    }

    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(now.getDate() + 7);

    try {
      const res = await calendar.events.list({
        calendarId: calendarId,
        timeMin: now.toISOString(),
        timeMax: nextWeek.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = res.data.items || [];
      const slots = events.slice(0, 3).map(event => ({
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        summary: event.summary
      }));

      return { available: true, slots };
    } catch (error) {
      throw new Error('Failed to fetch calendar availability');
    }
  }

  async createAppointment(clientEmail: string, startTime: string, endTime: string, summary: string) {
    if (!this.isConfigured()) {
      throw new Error('Calendar integration not configured. Set GOOGLE_REFRESH_TOKEN to enable appointment creation.');
    }

    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    const event = {
      summary: summary,
      description: `Cita agendada por ARIA AI para ${clientEmail}`,
      start: {
        dateTime: startTime,
        timeZone: 'America/El_Salvador',
      },
      end: {
        dateTime: endTime,
        timeZone: 'America/El_Salvador',
      },
      attendees: [
        { email: clientEmail },
      ],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 120 },
        ],
      },
    };

    try {
      const res = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
        sendUpdates: 'all'
      });
      return res.data;
    } catch (error) {
      throw new Error('Failed to create calendar event');
    }
  }
}

export const calendarService = new CalendarService();
