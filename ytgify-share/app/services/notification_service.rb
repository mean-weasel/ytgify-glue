class NotificationService
  # Create a notification for when someone likes a GIF
  def self.create_like_notification(like)
    return if like.user == like.gif.user # Don't notify if liking own GIF

    notification = Notification.create!(
      recipient: like.gif.user,
      actor: like.user,
      notifiable: like,
      action: "like"
    )

    broadcast_notification(notification)
  end

  # Create a notification for when someone comments on a GIF
  def self.create_comment_notification(comment)
    return if comment.user == comment.gif.user # Don't notify if commenting on own GIF

    notification = Notification.create!(
      recipient: comment.gif.user,
      actor: comment.user,
      notifiable: comment,
      action: "comment"
    )

    broadcast_notification(notification)
  end

  # Create a notification for when someone follows a user
  def self.create_follow_notification(follow)
    notification = Notification.create!(
      recipient: follow.following,
      actor: follow.follower,
      notifiable: follow,
      action: "follow"
    )

    broadcast_notification(notification)
  end

  # Create a notification for when someone adds a GIF to a collection
  def self.create_collection_add_notification(collection_gif)
    return if collection_gif.collection.user == collection_gif.gif.user # Don't notify if adding own GIF

    notification = Notification.create!(
      recipient: collection_gif.gif.user,
      actor: collection_gif.collection.user,
      notifiable: collection_gif,
      action: "collection_add",
      data: { collection_name: collection_gif.collection.name }.to_json
    )

    broadcast_notification(notification)
  end

  # Create a notification for when someone remixes a GIF
  def self.create_remix_notification(remix)
    return unless remix.parent_gif
    return if remix.user == remix.parent_gif.user # Don't notify if remixing own GIF

    notification = Notification.create!(
      recipient: remix.parent_gif.user,
      actor: remix.user,
      notifiable: remix,
      action: "remix"
    )

    broadcast_notification(notification)
  end

  private

  # Broadcast notification via ActionCable
  def self.broadcast_notification(notification)
    NotificationChannel.broadcast_to(
      notification.recipient,
      {
        id: notification.id,
        message: notification.message,
        actor_name: notification.actor.username,
        action: notification.action,
        created_at: notification.created_at.iso8601,
        read: notification.read?
      }
    )
  end
end
