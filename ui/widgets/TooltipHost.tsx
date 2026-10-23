/* eslint-disable react-native/no-inline-styles */
import React, {
  createContext,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

/** What a tooltip asks its host to draw, and how to tell it the bubble closed. */
export type TooltipSpec = {
  /** The tooltip showing it; the same owner showing again just redraws. */
  owner: object;
  node: React.ReactNode;
  onClose: () => void;
};

type TooltipHostValue = {
  /** The host's view, which icons measure themselves against. */
  hostRef: React.RefObject<View | null>;
  hostWidth: number;
  hostHeight: number;
  show: (spec: TooltipSpec) => void;
  /** Takes the bubble of `owner` away, if it is the one showing. */
  hide: (owner: object) => void;
};

export const TooltipHostContext = createContext<TooltipHostValue | null>(null);

/**
 * The layer a screen's tooltips open in: over everything else in the
 * screen, closed by a tap anywhere. It sits inside the panel or sheet it
 * serves, so it moves with it: an icon measured against it keeps its true
 * place even while the sheet slides, since Reanimated's transforms, which
 * the layout tree does not see, move the host and the icon alike.
 */
export default function TooltipHost({
  children,
}: {
  children: React.ReactNode;
}) {
  const hostRef = useRef<View>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [spec, setSpec] = useState<TooltipSpec | null>(null);

  const dismiss = useCallback(() => {
    setSpec(current => {
      current?.onClose();
      return null;
    });
  }, []);

  const value = useMemo<TooltipHostValue>(
    () => ({
      hostRef,
      hostWidth: size.width,
      hostHeight: size.height,
      show: next =>
        setSpec(current => {
          if (current && current.owner !== next.owner) {
            current.onClose();
          }
          return next;
        }),
      hide: owner =>
        setSpec(current => (current?.owner === owner ? null : current)),
    }),
    [size],
  );

  return (
    <TooltipHostContext.Provider value={value}>
      <View
        ref={hostRef}
        collapsable={false}
        style={{ flexGrow: 1 }}
        onLayout={e =>
          setSize({
            width: e.nativeEvent.layout.width,
            height: e.nativeEvent.layout.height,
          })
        }
      >
        {children}
        {!!spec && (
          <Pressable
            testID="tooltip.backdrop"
            accessibilityRole="button"
            onPress={dismiss}
            style={[StyleSheet.absoluteFill, { zIndex: 100, elevation: 100 }]}
          >
            {spec.node}
          </Pressable>
        )}
      </View>
    </TooltipHostContext.Provider>
  );
}
