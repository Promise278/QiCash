/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Poppins", "Inter", "System"],
      },
      colors: {
        qicash: {
          bg: "#fbf9f5",
          green: "#1f472e",
          greenDeep: "#1b3221",
          greenAccent: "#2c5b3f",
          sage: "#768566",
          sageLight: "#c1c0a2",
          sageButton: "#babb9e",
          brown: "#6f5f4a",
          brownText: "#84735f",
          brownDark: "#7c4628",
          avatar: "#d8d4ca",
          avatarIcon: "#aa623b",
          tile: "#f7f3eb",
          pill: "#f2ede2",
          card: "#f6f2ea",
          field: "#fcf8f2",
          ink: "#191d15",
          inkSoft: "#2b332c",
          muted: "#6b6e64",
          line: "#f0ede6",
          success: "#2b7a44",
        },
      },
      borderRadius: {
        pill: "999px",
      },
    },
  },
  plugins: [],
}