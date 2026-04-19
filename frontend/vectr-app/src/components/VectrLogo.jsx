export default function VectrLogo({ size = 40 }) {
    return (
        <img
            src="/vectr-logo.png"
            alt="Vectr"
            width={size}
            height={size}
            draggable={false}
            style={{
                width: size,
                height: size,
                objectFit: "contain",
                display: "block",
                userSelect: "none",
            }}
        />
    );
}
