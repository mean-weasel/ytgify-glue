class NotificationChannel < ApplicationCable::Channel
  def subscribed
    # Stream notifications for the current user
    stream_for current_user
  end

  def unsubscribed
    # Any cleanup needed when channel is unsubscribed
    stop_all_streams
  end
end
