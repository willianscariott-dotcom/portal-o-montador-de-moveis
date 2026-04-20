/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			colors: {
				'surface-container-low': '#f2f3ff',
				'inverse-surface': '#212f52',
				'primary-fixed': '#ffdea8',
				'surface-bright': '#faf8ff',
				'surface-dim': '#ced9ff',
				'surface-tint': '#7c5800',
				'on-tertiary': '#ffffff',
				'on-surface-variant': '#514532',
				'error': '#ba1a1a',
				'tertiary-container': '#00d7fe',
				'on-secondary-container': '#785a20',
				'on-primary-fixed': '#271900',
				'on-tertiary-fixed-variant': '#004e5d',
				'on-tertiary-container': '#005a6b',
				'on-background': '#0a1a3c',
				'on-secondary-fixed': '#271900',
				'outline': '#837560',
				'inverse-primary': '#ffba20',
				'primary': '#7c5800',
				'secondary-container': '#fdd48e',
				'surface': '#faf8ff',
				'tertiary': '#00687b',
				'primary-container': '#ffb800',
				'inverse-on-surface': '#eef0ff',
				'secondary-fixed': '#ffdea8',
				'on-secondary-fixed-variant': '#5d4208',
				'on-surface': '#0a1a3c',
				'secondary-fixed-dim': '#e8c17c',
				'outline-variant': '#d5c4ab',
				'on-primary': '#ffffff',
				'surface-variant': '#dae2ff',
				'on-secondary': '#ffffff',
				'on-error-container': '#93000a',
				'on-primary-container': '#6b4c00',
				'on-tertiary-fixed': '#001f27',
				'tertiary-fixed': '#b0ecff',
				'secondary': '#775a20',
				'on-primary-fixed-variant': '#5e4200',
				'background': '#faf8ff',
				'error-container': '#ffdad6',
				'surface-container-lowest': '#ffffff',
				'surface-container-highest': '#dae2ff',
				'surface-container-high': '#e2e7ff',
				'surface-container': '#eaedff',
				'tertiary-fixed-dim': '#17d8ff',
				'primary-fixed-dim': '#ffba20',
				'on-error': '#ffffff'
			},
			borderRadius: {
				DEFAULT: '0.25rem',
				lg: '0.5rem',
				xl: '0.75rem',
				full: '9999px'
			},
			fontFamily: {
				headline: ['Manrope'],
				body: ['Inter'],
				label: ['Inter']
			}
		}
	},
	plugins: []
}