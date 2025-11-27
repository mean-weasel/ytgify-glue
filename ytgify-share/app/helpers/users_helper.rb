module UsersHelper
  # Generate user avatar HTML (with fallback to initials)
  def user_avatar(user, size: :medium, css_class: "")
    size_map = {
      small: { pixels: "w-10 h-10", text: "text-lg" },
      medium: { pixels: "w-16 h-16", text: "text-2xl" },
      large: { pixels: "w-24 h-24", text: "text-3xl" }
    }

    config = size_map[size] || size_map[:medium]

    if user.avatar.attached?
      image_tag user.avatar,
                alt: user.username,
                class: "#{config[:pixels]} rounded-full object-cover #{css_class}"
    else
      content_tag :div,
                  user.username.first.upcase,
                  class: "#{config[:pixels]} bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold #{config[:text]} #{css_class}"
    end
  end

  # Format user stats with proper pluralization
  def user_stat(count, singular, plural = nil)
    plural ||= singular.pluralize
    content_tag :div do
      concat content_tag(:span, number_with_delimiter(count), class: "font-semibold text-gray-900")
      concat " "
      concat content_tag(:span, count == 1 ? singular : plural, class: "text-gray-600")
    end
  end

  # Check if current user is viewing their own profile
  def viewing_own_profile?(user)
    user_signed_in? && current_user == user
  end

  # Get tab CSS classes
  def profile_tab_class(current_tab, tab_name)
    base_classes = "py-4 px-2 border-b-2 font-medium text-sm transition-colors"

    if current_tab == tab_name
      "#{base_classes} border-indigo-500 text-indigo-600"
    else
      "#{base_classes} border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
    end
  end
end
