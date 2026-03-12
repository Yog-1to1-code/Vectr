export default function VectrLogo({ size = 40 }) {
    return (
        <svg width={size} height={size * 0.85} viewBox="2642 154 76 65" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
                d="M2717.97,154.598L2701.12,196.489C2700.71,197.534,2700.11,198.463,2699.36,199.226L2680.46,218.781C2680.09,219.2,2679.72,218.923,2679.54,218.728L2660.64,199.225C2659.9,198.457,2659.3,197.526,2658.88,196.487L2642.03,154.597C2641.87,154.184,2642.32,153.805,2642.62,154.113L2679.76,192.431C2679.89,192.581,2680.11,192.581,2680.25,192.431L2717.38,154.113C2717.67,153.804,2718.13,154.184,2717.97,154.597Z"
                fill="url(#vectr-logo-grad)"
            />
            <defs>
                <linearGradient id="vectr-logo-grad" x1="2680" y1="154" x2="2680" y2="219" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#d7f2ff" />
                    <stop offset="1" stopColor="#60a5fa" />
                </linearGradient>
            </defs>
        </svg>
    );
}
