import { ref, computed } from 'vue'

const GUIDE_SEEN_KEY = 'wikiroulette:guideSeen'
const GUIDE_VERSION = 1

export interface GuideStep {
  id: string
  title: string
  description: string
  highlight?: {
    selector: string
    position?: 'top' | 'bottom' | 'left' | 'right'
  }
  action?: {
    type: 'click' | 'next' | 'skip'
    target?: string
  }
}

const GUIDE_STEPS: GuideStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to WikiRoulette',
    description: 'Discover random Wikipedia articles and learn deeply with our Pomodoro mode. Let us show you around.',
    action: { type: 'next' }
  },
  {
    id: 'spin',
    title: 'Spin for Random Articles',
    description: 'Click the Spin button or press Space/→ to discover a new random Wikipedia article.',
    highlight: { selector: '.spin-btn', position: 'top' },
    action: { type: 'click', target: '.spin-btn' }
  },
  {
    id: 'read',
    title: 'Read Full Articles',
    description: 'Click "Read Full Article" or press R to dive into the complete article with our clean reader.',
    highlight: { selector: '.read-btn', position: 'top' }
  },
  {
    id: 'pomodoro',
    title: 'Learn with Pomodoro Mode',
    description: 'Click "Learn Mode" or press L to start a structured learning session: read, reflect, and deepen your understanding.',
    highlight: { selector: '.pomodoro-btn', position: 'top' }
  },
  {
    id: 'shortcuts',
    title: 'Keyboard Shortcuts',
    description: 'Press F1 or Shift+? anytime to see all available keyboard shortcuts.',
    action: { type: 'next' }
  },
  {
    id: 'complete',
    title: "You're All Set!",
    description: 'Start exploring. You can always revisit this guide from the menu.',
    action: { type: 'skip' }
  }
]

export function useFirstTimeGuide() {
  const isActive = ref(false)
  const currentStepIndex = ref(0)
  const hasSeenGuide = ref(false)

  // Check if user has seen the guide
  function checkGuideStatus() {
    const seen = localStorage.getItem(GUIDE_SEEN_KEY)
    const version = localStorage.getItem(`${GUIDE_SEEN_KEY}:version`)
    
    if (seen === 'true' && version === String(GUIDE_VERSION)) {
      hasSeenGuide.value = true
      return false
    }
    return true
  }

  function startGuide() {
    if (!checkGuideStatus()) return
    
    isActive.value = true
    currentStepIndex.value = 0
    document.body.style.overflow = 'hidden'
  }

  function nextStep() {
    if (currentStepIndex.value < GUIDE_STEPS.length - 1) {
      currentStepIndex.value++
    } else {
      completeGuide()
    }
  }

  function prevStep() {
    if (currentStepIndex.value > 0) {
      currentStepIndex.value--
    }
  }

  function skipStep() {
    completeGuide()
  }

  function completeGuide() {
    isActive.value = false
    document.body.style.overflow = ''
    localStorage.setItem(GUIDE_SEEN_KEY, 'true')
    localStorage.setItem(`${GUIDE_SEEN_KEY}:version`, String(GUIDE_VERSION))
    hasSeenGuide.value = true
  }

  function resetGuide() {
    localStorage.removeItem(GUIDE_SEEN_KEY)
    localStorage.removeItem(`${GUIDE_SEEN_KEY}:version`)
    hasSeenGuide.value = false
  }

  const currentStep = computed(() => GUIDE_STEPS[currentStepIndex.value])
  const progress = computed(() => 
    ((currentStepIndex.value + 1) / GUIDE_STEPS.length) * 100
  )

  // Handle keyboard navigation
  function handleKeydown(e: KeyboardEvent) {
    if (!isActive.value) return
    
    if (e.key === 'ArrowRight' || e.key === ' ') {
      e.preventDefault()
      nextStep()
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      prevStep()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      skipStep()
    }
  }

  return {
    isActive,
    currentStep,
    progress,
    hasSeenGuide,
    startGuide,
    nextStep,
    prevStep,
    skipStep,
    completeGuide,
    resetGuide,
    handleKeydown,
    checkGuideStatus
  }
}