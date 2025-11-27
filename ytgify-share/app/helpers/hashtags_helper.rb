module HashtagsHelper
  def rank_badge_color(rank)
    case rank
    when 1
      "bg-gradient-to-br from-yellow-400 to-yellow-600 text-white shadow-lg"
    when 2
      "bg-gradient-to-br from-gray-300 to-gray-500 text-white shadow-lg"
    when 3
      "bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-lg"
    when 4..10
      "bg-gradient-to-br from-indigo-500 to-purple-600 text-white"
    else
      "bg-gray-100 text-gray-700"
    end
  end

  def rank_border_color(rank)
    case rank
    when 1
      "border-yellow-500"
    when 2
      "border-gray-400"
    when 3
      "border-orange-500"
    when 4..10
      "border-indigo-500"
    else
      "border-gray-300"
    end
  end
end
