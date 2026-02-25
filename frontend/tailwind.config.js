/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
  	extend: {
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			},
  			'float': {
  				'0%, 100%': { transform: 'translateY(0px)' },
  				'50%': { transform: 'translateY(-10px)' }
  			},
  			'pulse-glow': {
  				'0%, 100%': { boxShadow: '0 0 0 0 hsla(14, 85%, 58%, 0.3)' },
  				'50%': { boxShadow: '0 0 20px 4px hsla(14, 85%, 58%, 0.15)' }
  			},
  			'typewriter-blink': {
  				'0%, 100%': { opacity: '1' },
  				'50%': { opacity: '0' }
  			},
  			'scroll-train': {
  				'0%': { transform: 'translateX(0)' },
  				'100%': { transform: 'translateX(-50%)' }
  			},
  			'glow-pulse': {
  				'0%, 100%': { opacity: '0.3', transform: 'scale(1)' },
  				'50%': { opacity: '0.5', transform: 'scale(1.05)' }
  			},
  			'fade-in-up': {
  				'0%': { opacity: '0', transform: 'translateY(12px)' },
  				'100%': { opacity: '1', transform: 'translateY(0)' }
  			},
  			'orb-breathe': {
  				'0%, 100%': { transform: 'translateY(0px) scale(1)' },
  				'50%': { transform: 'translateY(-2px) scale(1.03)' }
  			},
  			'orb-glow': {
  				'0%, 100%': { opacity: '0.55', transform: 'scale(1)' },
  				'50%': { opacity: '0.85', transform: 'scale(1.06)' }
  			},
  			'speech-bounce': {
  				'0%': { opacity: '0', transform: 'translateY(10px) scale(0.95)' },
  				'60%': { opacity: '1', transform: 'translateY(-2px) scale(1.02)' },
  				'100%': { opacity: '1', transform: 'translateY(0px) scale(1)' }
  			},
  			'welcome-fade-in': {
  				'0%': { opacity: '0', transform: 'translateY(10px)' },
  				'100%': { opacity: '1', transform: 'translateY(0px)' }
  			},
  			'mini-orb-pulse': {
  				'0%, 100%': { boxShadow: '0 0 0 0 rgba(168, 85, 247, 0.35)' },
  				'50%': { boxShadow: '0 0 0 10px rgba(168, 85, 247, 0)' }
  			},
  			'blink-eyes': {
  				'0%, 45%, 100%': { transform: 'scaleY(1)' },
  				'47%': { transform: 'scaleY(0.15)' },
  				'50%': { transform: 'scaleY(1)' }
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'float': 'float 6s ease-in-out infinite',
  			'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
  			'typewriter-blink': 'typewriter-blink 0.7s step-end infinite',
  			'scroll-train': 'scroll-train 30s linear infinite',
  			'glow-pulse': 'glow-pulse 4s ease-in-out infinite',
  			'fade-in-up': 'fade-in-up 0.6s ease-out forwards',
  			'orb-breathe': 'orb-breathe 4s ease-in-out infinite',
  			'orb-glow': 'orb-glow 4s ease-in-out infinite',
  			'speech-bounce': 'speech-bounce 500ms cubic-bezier(.2,.9,.2,1) both',
  			'welcome-fade-in': 'welcome-fade-in 600ms ease-out both',
  			'mini-orb-pulse': 'mini-orb-pulse 3s ease-in-out infinite',
  			'blink-eyes': 'blink-eyes 4s ease-in-out infinite'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
