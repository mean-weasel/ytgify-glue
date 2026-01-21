# Clear existing data
puts "🧹 Cleaning database..."
Comment.destroy_all
Like.destroy_all
Follow.destroy_all
CollectionGif.destroy_all
GifHashtag.destroy_all
Collection.destroy_all
Hashtag.destroy_all

# Manually purge attachments to avoid ActiveStorage bug
Gif.find_each do |gif|
  gif.file.purge if gif.file.attached?
end
Gif.delete_all  # Use delete_all to bypass callbacks

User.destroy_all

puts "👥 Creating users..."

# Create integration test user (required by extension backend-api.spec.ts)
integration_user = User.create!(
  email: "test@example.com",
  username: "testuser",
  password: "password123",
  password_confirmation: "password123",
  display_name: "Test User",
  bio: "Integration test user for extension ↔ backend testing"
)
puts "  ✓ Created #{integration_user.username} (integration test)"

# Create test users
users = [integration_user]
5.times do |i|
  user = User.create!(
    email: "user#{i + 1}@example.com",
    username: "testuser#{i + 1}",
    password: "password123",
    password_confirmation: "password123",
    display_name: "Test User #{i + 1}",
    bio: "I'm test user #{i + 1}. I love creating and sharing GIFs!"
  )
  users << user
  puts "  ✓ Created #{user.username}"
end

puts "\n📷 Creating GIFs..."

# Sample YouTube video IDs for testing
youtube_ids = [
  "dQw4w9WgXcQ",  # Rick Roll
  "jNQXAC9IVRw",  # Me at the zoo
  "OPf0YbXqDm0",  # Mark Ronson - Uptown Funk
  "kJQP7kiw5Fk",  # Luis Fonsi - Despacito
  "9bZkp7q19f0"   # PSY - Gangnam Style
]

# Sample GIF files for visual testing
sample_gifs = [
  Rails.root.join('test', 'fixtures', 'files', 'sample_gifs', 'blue_wave.gif'),
  Rails.root.join('test', 'fixtures', 'files', 'sample_gifs', 'red_pulse.gif'),
  Rails.root.join('test', 'fixtures', 'files', 'sample_gifs', 'green_flash.gif'),
  Rails.root.join('test', 'fixtures', 'files', 'sample_gifs', 'purple_glow.gif'),
  Rails.root.join('test', 'fixtures', 'files', 'sample_gifs', 'yellow_shine.gif')
]

gifs = []
users.each_with_index do |user, user_index|
  # Each user creates 6 GIFs
  6.times do |gif_index|
    privacy = [ :public_access, :public_access, :public_access, :unlisted, :private_access ][gif_index % 5]
    video_id = youtube_ids.sample
    start_time = rand(0..60)
    end_time = rand(61..120)

    gif = Gif.create!(
      user: user,
      title: "#{user.username}'s GIF ##{gif_index + 1}",
      description: "This is an awesome GIF from #{user.username}. Check it out!",
      youtube_video_url: "https://www.youtube.com/watch?v=#{video_id}",
      youtube_timestamp_start: start_time,
      youtube_timestamp_end: end_time,
      duration: end_time - start_time,
      privacy: privacy,
      view_count: rand(10..1000),
      like_count: rand(0..100)
    )

    # Attach a sample GIF file to make it visible in the app
    sample_gif_path = sample_gifs[gif_index % sample_gifs.length]
    if File.exist?(sample_gif_path)
      begin
        blob = ActiveStorage::Blob.create_and_upload!(
          io: StringIO.new(File.binread(sample_gif_path)),
          filename: File.basename(sample_gif_path),
          content_type: 'image/gif'
        )
        gif.file.attach(blob)
      rescue => e
        puts "\n  ⚠️  Failed to attach file to #{gif.title}: #{e.message}"
      end
    end

    gifs << gif
    print "."
  end
end
puts "\n  ✓ Created #{gifs.count} GIFs with attached files"

puts "\n#️⃣ Creating hashtags..."

# Create hashtags
hashtags = []
hashtag_names = [ 'funny', 'animals', 'music', 'dance', 'gaming', 'sports', 'memes', 'reaction', 'tutorial', 'vlog' ]
hashtag_names.each do |name|
  hashtag = Hashtag.find_or_create_by!(name: name)
  hashtags << hashtag
end
puts "  ✓ Created #{hashtags.count} hashtags"

# Associate hashtags with GIFs
puts "\n🔗 Associating hashtags with GIFs..."
gifs.each do |gif|
  # Add 1-3 random hashtags to each GIF
  selected_hashtags = hashtags.sample(rand(1..3))
  selected_hashtags.each do |hashtag|
    gif.hashtags << hashtag unless gif.hashtags.include?(hashtag)
  end
  print "."
end
puts "\n  ✓ Associated hashtags with GIFs"

puts "\n❤️ Creating likes..."
# Create likes (users like random GIFs)
like_count = 0
users.each do |user|
  # Each user likes 5-10 random GIFs
  gifs.sample(rand(5..10)).each do |gif|
    next if gif.user == user # Don't like own GIFs

    Like.find_or_create_by!(user: user, gif: gif) do
      like_count += 1
    end
  end
  print "."
end
puts "\n  ✓ Created #{like_count} likes"

puts "\n💬 Creating comments..."
# Create comments
comment_texts = [
  "This is hilarious! 😂",
  "Love this GIF!",
  "Where is this from?",
  "Perfect reaction GIF!",
  "This made my day!",
  "Can't stop watching this!",
  "Brilliant edit!",
  "The timing is perfect!",
  "This is gold!",
  "Saved to my collection!"
]

comment_count = 0
gifs.each do |gif|
  # 0-5 comments per GIF
  rand(0..5).times do
    commenter = users.sample
    Comment.create!(
      user: commenter,
      gif: gif,
      content: comment_texts.sample
    )
    comment_count += 1
  end
  print "."
end
puts "\n  ✓ Created #{comment_count} comments"

puts "\n👥 Creating follows..."
# Create follows (social network)
follow_count = 0
users.each do |user|
  # Each user follows 2-4 other users
  other_users = users - [ user ]
  other_users.sample(rand(2..4)).each do |followed_user|
    Follow.find_or_create_by!(follower: user, following: followed_user) do
      follow_count += 1
    end
  end
  print "."
end
puts "\n  ✓ Created #{follow_count} follows"

puts "\n📚 Creating collections..."
# Create collections
collections = []
users.each_with_index do |user, index|
  # Each user creates 1-2 collections
  rand(1..2).times do |col_index|
    is_public = [ true, true, false ].sample

    collection = Collection.create!(
      user: user,
      name: "#{user.username}'s Collection ##{col_index + 1}",
      description: "A curated collection of my favorite GIFs",
      is_public: is_public
    )

    # Add 3-8 GIFs to each collection
    gifs.sample(rand(3..8)).each do |gif|
      collection.gifs << gif unless collection.gifs.include?(gif)
    end

    collections << collection
    print "."
  end
end
puts "\n  ✓ Created #{collections.count} collections"

puts "\n✨ Seed data created successfully!"
puts "\n📊 Summary:"
puts "  Users: #{User.count}"
puts "  GIFs: #{Gif.count}"
puts "  Hashtags: #{Hashtag.count}"
puts "  Likes: #{Like.count}"
puts "  Comments: #{Comment.count}"
puts "  Follows: #{Follow.count}"
puts "  Collections: #{Collection.count}"
puts "\n🔑 Test Credentials:"
puts "  Integration: test@example.com / password123"
puts "  Other users: user1@example.com to user5@example.com"
puts "  Password: password123"
puts "\n🎉 Ready to test!"
