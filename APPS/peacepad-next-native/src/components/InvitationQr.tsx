import React, { useMemo } from "react";
import qrcode from "qrcode-generator";
import Svg, { Path, Rect } from "react-native-svg";
import { colors } from "../theme";

const QUIET_ZONE_MODULES = 4;

export function buildInvitationQrPath(value: string) {
  const code = qrcode(0, "M");
  code.addData(value, "Byte");
  code.make();

  const moduleCount = code.getModuleCount();
  const path: string[] = [];
  for (let row = 0; row < moduleCount; row += 1) {
    for (let column = 0; column < moduleCount; column += 1) {
      if (code.isDark(row, column)) {
        const x = column + QUIET_ZONE_MODULES;
        const y = row + QUIET_ZONE_MODULES;
        path.push(`M${x} ${y}h1v1h-1z`);
      }
    }
  }

  return {
    moduleCount,
    path: path.join(""),
    viewBoxSize: moduleCount + (QUIET_ZONE_MODULES * 2)
  };
}

export function InvitationQr({ size = 184, value }: { size?: number; value: string }) {
  const qr = useMemo(() => buildInvitationQrPath(value), [value]);
  return (
    <Svg
      accessible={false}
      height={size}
      viewBox={`0 0 ${qr.viewBoxSize} ${qr.viewBoxSize}`}
      width={size}
    >
      <Rect fill={colors.surface} height={qr.viewBoxSize} width={qr.viewBoxSize} x={0} y={0} />
      <Path d={qr.path} fill={colors.text} />
    </Svg>
  );
}
