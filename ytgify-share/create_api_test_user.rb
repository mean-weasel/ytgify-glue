# Create test user for API integration tests
puts "Creating test user for API integration..."

begin
  # Use the email that the Playwright tests expect
  user = User.find_or_initialize_by(email: "gifmaster@example.com")

  if user.new_record?
    user.username = "gifmaster"
    user.password = "password123"
    user.password_confirmation = "password123"
    user.full_name = "GIF Master"
    user.bio = "Test user for API integration"
    user.save!
    puts "✓ Created new user: #{user.email}"
  else
    # Update existing user's password
    user.password = "password123"
    user.password_confirmation = "password123"
    user.save!
    puts "✓ Updated existing user: #{user.email}"
  end

  # Verify password works
  if user.valid_password?("password123")
    puts "✓ Password verified: password123"
  else
    puts "✗ Password verification failed!"
  end

  puts "\n📝 Test Credentials:"
  puts "   Email: gifmaster@example.com"
  puts "   Password: password123"
  puts "   Username: #{user.username}"
  puts "   ID: #{user.id}"
  puts "\n✅ User ready for API testing!"

rescue => e
  puts "✗ Error: #{e.message}"
  puts e.backtrace.first(5)
end
