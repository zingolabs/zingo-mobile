export function mixnetStatusPayload(
  indicator: string,
  socks5Addr?: string,
): string {
  return JSON.stringify(
    socks5Addr === undefined
      ? { mixnet_indicator: indicator }
      : { mixnet_indicator: indicator, socks5_addr: socks5Addr },
  );
}
