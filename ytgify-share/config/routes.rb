require 'sidekiq/web'
require 'sidekiq/cron/web'

Rails.application.routes.draw do
  # Sidekiq Web UI (protect in production!)
  mount Sidekiq::Web => '/sidekiq'

  # Devise authentication
  devise_for :users

  # Web routes (Hotwire frontend)
  root "home#feed"
  get "trending", to: "home#trending"

  resources :gifs, only: [:index, :show, :new, :create, :edit, :update, :destroy] do
    member do
      post :like, to: "likes#toggle"
      get :remix, to: "remixes#new"
      post :create_remix, to: "remixes#create"
    end
    resources :comments, only: [:create]
  end

  # Top-level comment routes for edit, update, delete (outside nested route)
  resources :comments, only: [:edit, :update, :destroy]

  resources :users, only: [:show], param: :username do
    member do
      post :follow, to: "follows#toggle"
      get :followers
      get :following
    end
  end

  resources :collections, only: [:index, :show, :new, :create, :edit, :update, :destroy] do
    member do
      post 'add_gif'
      delete 'remove_gif/:gif_id', action: :remove_gif, as: 'remove_gif'
    end
  end
  resources :hashtags, only: [:index, :show], param: :name do
    collection do
      get :trending
    end
  end

  resources :notifications, only: [:index] do
    member do
      post :mark_as_read
    end
    collection do
      post :mark_all_as_read
    end
  end

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # API routes
  namespace :api do
    namespace :v1 do
      # Authentication endpoints
      post 'auth/register', to: 'auth#register'
      post 'auth/login', to: 'auth#login'
      delete 'auth/logout', to: 'auth#logout'
      post 'auth/refresh', to: 'auth#refresh'
      get 'auth/me', to: 'auth#me'

      # GIF endpoints
      resources :gifs, only: [:index, :show, :create, :update, :destroy] do
        # Nested like endpoint (toggle like)
        resources :likes, only: [:create, :destroy]

        # Nested comments
        resources :comments, only: [:index, :create]
      end

      # Top-level comment endpoints for update/delete
      resources :comments, only: [:update, :destroy]

      # Follow endpoints
      resources :users, only: [] do
        post 'follow', to: 'follows#create'
        delete 'follow', to: 'follows#destroy'
        get 'followers', to: 'follows#followers'
        get 'following', to: 'follows#following'
        get 'collections', to: 'collections#index'
      end

      # Collection endpoints
      resources :collections do
        member do
          post 'add_gif'
          delete 'remove_gif/:gif_id', action: :remove_gif
          patch 'reorder'
        end
      end

      # Hashtag endpoints
      resources :hashtags, only: [:index, :show] do
        collection do
          get 'trending'
          get 'search'
        end
      end

      # Feed endpoints
      get 'feed', to: 'feed#index'
      get 'feed/public', to: 'feed#public'
      get 'feed/trending', to: 'feed#trending'
      get 'feed/recent', to: 'feed#recent'
      get 'feed/popular', to: 'feed#popular'
      get 'feed/following', to: 'feed#following'
    end
  end

  # Defines the root path route ("/")
  # root "posts#index"
end
