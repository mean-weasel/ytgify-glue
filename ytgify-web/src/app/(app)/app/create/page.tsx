import { AppHeader } from '@/components/layout'
import { PlusCircleIcon } from '@/components/icons'

export default function CreatePage() {
  return (
    <>
      <AppHeader showBack title="Create GIF" showSearch={false} />

      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Extension CTA */}
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center">
            <PlusCircleIcon size={40} className="text-white" />
          </div>

          <h1 className="text-2xl font-bold mb-3">Create GIFs from YouTube</h1>
          <p className="text-gray-400 mb-8 max-w-sm mx-auto">
            Install the YTgify browser extension to create GIFs directly from any YouTube video.
          </p>

          <div className="space-y-4">
            {/* Chrome Extension */}
            <a
              href="https://chrome.google.com/webstore/detail/ytgify"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 bg-gray-900 hover:bg-gray-800 rounded-xl transition-colors"
            >
              <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center">
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C8.21 0 4.831 1.757 2.632 4.501l3.953 6.848A5.454 5.454 0 0 1 12 6.545h10.691A12 12 0 0 0 12 0zM1.931 5.47A11.943 11.943 0 0 0 0 12c0 6.012 4.42 10.991 10.189 11.864l3.953-6.847a5.45 5.45 0 0 1-6.865-2.29zm13.342 2.166a5.446 5.446 0 0 1 1.45 7.09l.002.001h-.002l-3.953 6.848c.062.002.125.003.188.003 6.627 0 12-5.373 12-12 0-1.071-.14-2.11-.402-3.096zM12 16.364a4.364 4.364 0 1 1 0-8.728 4.364 4.364 0 0 1 0 8.728z"/>
                </svg>
              </div>
              <div className="flex-1 text-left">
                <div className="font-semibold">Chrome Extension</div>
                <div className="text-sm text-gray-400">Add to Chrome</div>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>

            {/* Firefox Extension */}
            <a
              href="https://addons.mozilla.org/firefox/addon/ytgify"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 bg-gray-900 hover:bg-gray-800 rounded-xl transition-colors"
            >
              <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center">
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8.824 7.287c.008 0 .004 0 0 0zm-2.8-1.4c.006 0 .003 0 0 0zm16.754 2.161c-.505-1.215-1.53-2.528-2.333-2.943.654 1.283 1.033 2.57 1.177 3.53l.002.02c-1.314-3.278-3.544-4.6-5.366-7.477-.096-.147-.19-.295-.28-.448a3.2 3.2 0 0 1-.106-.196 1.94 1.94 0 0 1-.07-.18.72.72 0 0 0-.22-.237.25.25 0 0 0-.012-.008l-.008-.003a.05.05 0 0 0-.008 0c-.028.01-.037.032-.044.062-.003.01-.01.018-.01.026l-.006.012s0 .01 0 .012c-3.12 5.478-1.185 9.67-.135 11.04.65.854 1.075 1.843 1.22 2.882.073.52.101 1.047.086 1.575.016.004.033.007.049.01.1-.076.195-.16.283-.25.4.055.802.088 1.204.098l.167.004c.3.001.6-.02.896-.065.082-.013.163-.028.244-.046l.091-.02c.074-.018.146-.038.219-.06l.08-.025a7.45 7.45 0 0 0 2.298-1.143l.024-.016c.063-.043.082-.115.042-.177-.13-.186-.265-.366-.406-.538 0 0-.015-.02-.038-.045a7.12 7.12 0 0 0 1.033-.91c.063-.065.123-.133.184-.2l.044-.05.073-.086c.203-.255.39-.523.56-.8.018-.03.035-.06.054-.092l.018-.03c.028-.05.058-.103.087-.155l.024-.043a5.4 5.4 0 0 0 .25-.54l.01-.026a9.4 9.4 0 0 0 .208-.64c.014-.046.026-.093.038-.14l.016-.064c.015-.063.03-.126.043-.19.016-.073.03-.147.044-.22l.012-.07.028-.17c.01-.067.018-.135.026-.203l.006-.057c.01-.098.018-.196.024-.294l.003-.044a6.9 6.9 0 0 0-.005-.723z"/>
                </svg>
              </div>
              <div className="flex-1 text-left">
                <div className="font-semibold">Firefox Add-on</div>
                <div className="text-sm text-gray-400">Add to Firefox</div>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>

          {/* How it works */}
          <div className="mt-12 text-left">
            <h2 className="text-lg font-semibold mb-4">How it works</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-pink-500/20 text-pink-500 flex items-center justify-center text-sm font-bold shrink-0">
                  1
                </div>
                <p className="text-gray-400 text-sm">
                  Install the extension and go to any YouTube video
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-pink-500/20 text-pink-500 flex items-center justify-center text-sm font-bold shrink-0">
                  2
                </div>
                <p className="text-gray-400 text-sm">
                  Click the YTgify button to open the GIF creator
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-pink-500/20 text-pink-500 flex items-center justify-center text-sm font-bold shrink-0">
                  3
                </div>
                <p className="text-gray-400 text-sm">
                  Select start/end times, add text, and create your GIF
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-pink-500/20 text-pink-500 flex items-center justify-center text-sm font-bold shrink-0">
                  4
                </div>
                <p className="text-gray-400 text-sm">
                  Download or share directly to YTgify
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
