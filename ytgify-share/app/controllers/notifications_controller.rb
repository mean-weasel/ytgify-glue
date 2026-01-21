class NotificationsController < ApplicationController
  before_action :authenticate_user!

  def index
    @notifications = current_user.notifications
                                  .includes(:actor, :notifiable)
                                  .recent
                                  .limit(50)

    @unread_count = current_user.notifications.unread.count

    respond_to do |format|
      format.html
      format.json do
        render json: {
          notifications: @notifications.map { |n| notification_json(n) },
          unread_count: @unread_count
        }
      end
    end
  end

  def mark_as_read
    @notification = current_user.notifications.find(params[:id])
    @notification.mark_as_read!

    respond_to do |format|
      format.html { redirect_back(fallback_location: app_notifications_path) }
      format.json { render json: { success: true } }
      format.turbo_stream
    end
  end

  def mark_all_as_read
    current_user.notifications.unread.update_all(read_at: Time.current)

    respond_to do |format|
      format.html { redirect_to app_notifications_path, notice: "All notifications marked as read" }
      format.json { render json: { success: true } }
      format.turbo_stream
    end
  end

  private

  def notification_json(notification)
    {
      id: notification.id,
      message: notification.message,
      read: notification.read?,
      created_at: notification.created_at.iso8601,
      actor: {
        username: notification.actor.username,
        avatar_url: notification.actor.avatar_url
      }
    }
  end
end
