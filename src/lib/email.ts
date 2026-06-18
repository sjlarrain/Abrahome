import 'server-only'
import { Resend } from 'resend'
import { env } from '@/lib/env'

const resend = new Resend(env.RESEND_API_KEY)

type BookingConfirmationProps = {
  to: string
  houseName: string
  checkInDate: string
  checkOutDate: string
  attendeeCount: number
  bookingId: string
  appUrl: string
}

export async function sendBookingConfirmation(props: BookingConfirmationProps) {
  const { to, houseName, checkInDate, checkOutDate, attendeeCount, bookingId, appUrl } = props

  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to,
    subject: `Your booking request for ${houseName} has been received`,
    html: `
      <p>Hi,</p>
      <p>Your booking request has been received and is pending review.</p>
      <ul>
        <li><strong>House:</strong> ${houseName}</li>
        <li><strong>Check-in:</strong> ${checkInDate}</li>
        <li><strong>Check-out:</strong> ${checkOutDate}</li>
        <li><strong>Attendees:</strong> ${attendeeCount}</li>
        <li><strong>Status:</strong> Pending</li>
      </ul>
      <p>
        <a href="${appUrl}/dashboard/bookings/${bookingId}">View booking</a>
      </p>
      <p>You will be notified when the admin reviews your request.</p>
    `,
  })

  if (error) {
    console.error('[email] booking confirmation failed:', error)
  }
}

type BookingStatusProps = {
  to: string
  houseName: string
  checkInDate: string
  checkOutDate: string
  bookingId: string
  appUrl: string
  status: 'confirmed' | 'rejected' | 'cancelled'
  reason?: string
}

export async function sendBookingStatusUpdate(props: BookingStatusProps) {
  const { to, houseName, checkInDate, checkOutDate, bookingId, appUrl, status, reason } = props

  const statusLabel =
    status === 'confirmed' ? 'Confirmed' :
    status === 'rejected' ? 'Rejected' : 'Cancelled'

  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to,
    subject: `Your booking for ${houseName} has been ${statusLabel.toLowerCase()}`,
    html: `
      <p>Hi,</p>
      <p>Your booking request status has been updated to <strong>${statusLabel}</strong>.</p>
      <ul>
        <li><strong>House:</strong> ${houseName}</li>
        <li><strong>Check-in:</strong> ${checkInDate}</li>
        <li><strong>Check-out:</strong> ${checkOutDate}</li>
        ${reason ? `<li><strong>Reason:</strong> ${reason}</li>` : ''}
      </ul>
      <p>
        <a href="${appUrl}/dashboard/bookings/${bookingId}">View booking</a>
      </p>
    `,
  })

  if (error) {
    console.error('[email] booking status update failed:', error)
  }
}
