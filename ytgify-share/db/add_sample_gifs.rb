# Quick script to add sample GIFs with file attachments
# Run with: bin/rails runner db/add_sample_gifs.rb

puts "📷 Adding sample GIFs with file attachments..."

# Get first user or create one
user = User.first || User.create!(
  email: "demo@example.com",
  username: "demo",
  password: "password123",
  password_confirmation: "password123",
  display_name: "Demo User",
  bio: "Demo account with sample GIFs"
)

# Sample GIF files
sample_gifs = [
  { file: 'blue_wave.gif', title: 'Blue Wave Animation', desc: 'Calming blue wave effect' },
  { file: 'red_pulse.gif', title: 'Red Pulse Animation', desc: 'Energetic red pulse' },
  { file: 'green_flash.gif', title: 'Green Flash Animation', desc: 'Fresh green flash' },
  { file: 'purple_glow.gif', title: 'Purple Glow Animation', desc: 'Mysterious purple glow' },
  { file: 'yellow_shine.gif', title: 'Yellow Shine Animation', desc: 'Bright yellow shine' }
]

sample_gifs.each do |gif_data|
  gif_path = Rails.root.join('test', 'fixtures', 'files', 'sample_gifs', gif_data[:file])

  if File.exist?(gif_path)
    gif = Gif.create!(
      user: user,
      title: gif_data[:title],
      description: gif_data[:desc],
      youtube_video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      youtube_timestamp_start: 0,
      youtube_timestamp_end: 5,
      duration: 5,
      privacy: :public_access
    )

    gif.file.attach(
      io: File.open(gif_path),
      filename: gif_data[:file],
      content_type: 'image/gif'
    )

    puts "  ✓ Created #{gif.title}"
  else
    puts "  ✗ File not found: #{gif_path}"
  end
end

puts "\n✅ Done! Added #{sample_gifs.count} sample GIFs"
puts "Visit http://localhost:3000 to see them!"
