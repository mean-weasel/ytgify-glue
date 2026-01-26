# frozen_string_literal: true

# OmniAuth configuration
# Allow GET requests for OAuth initiation (needed for browser extension)
# The extension opens a new tab with the OAuth URL which is a GET request
OmniAuth.config.allowed_request_methods = [:get, :post]

# Silence GET request deprecation warning
OmniAuth.config.silence_get_warning = true
