/* eslint-disable react-native/no-inline-styles */
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { ServerUrisType, TranslateType } from '@app/AppState';
import { LoadingDots } from '@ui/widgets/ProgressState';
import ServerRow, {
  DoneButton,
  Latency,
  Placement,
  RowCard,
  ScreenHeader,
  useLift,
} from '@screens/Server/ServerRow';
import { useScrollEdges } from '@ui/widgets/ScrollEdges';
import { blocksBehind } from '@app/services/serverHealth';
import { formatInteger } from '@app/utils/formatAmount';

type ServerListProps = {
  translate: (key: string) => TranslateType;
  servers: ServerUrisType[];
  loading: boolean;
  latencies: Record<string, number | null>;
  /** The block each server gave, to mark the ones behind the tip. */
  heights?: Record<string, number>;
  selectedUri: string | null;
  busy: boolean;
  onPick: (server: ServerUrisType) => void;
  onUnreachable: () => void;
  onBack: () => void;
  placement?: Placement;
};

const BODY_TOP = 104.5 / 874;
const BODY_BOTTOM = 110;

const hostOf = (uri: string) => uri.replace(/^https?:\/\//, '');

// Other servers of a network, one per row; a server that did not answer
// the probe shakes instead of being picked.
const ServerList: React.FunctionComponent<ServerListProps> = ({
  translate,
  servers,
  loading,
  latencies,
  heights = {},
  selectedUri,
  busy,
  onPick,
  onUnreachable,
  onBack,
  placement = 'screen',
}) => {
  const [shakes, setShakes] = useState<Record<string, number>>({});
  const { lift, onLayout } = useLift(placement, BODY_TOP);
  const { edges, fades } = useScrollEdges();
  /** The highest block any server here gave. */
  const tip = Math.max(0, ...Object.values(heights));

  return (
    <View style={{ flex: 1 }} onLayout={onLayout}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        {...edges}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: `${BODY_TOP * 100}%`,
          marginTop: -lift,
          bottom: BODY_BOTTOM,
        }}
        contentContainerStyle={{ paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {loading && (
          <View style={{ paddingTop: 40 }}>
            <LoadingDots testID="serverlist.loading" />
          </View>
        )}
        {!loading && (
          <RowCard>
            {servers.map((s, i) => (
              <ServerRow
                key={s.uri}
                testID={`serverlist.pick.${hostOf(s.uri)}`}
                first={i === 0}
                title={hostOf(s.uri)}
                note={
                  blocksBehind(heights[s.uri] ?? 0, tip) > 0
                    ? (translate('server.behind') as string).replace(
                        '{n}',
                        formatInteger(blocksBehind(heights[s.uri] ?? 0, tip)),
                      )
                    : undefined
                }
                sub={s.region}
                selected={selectedUri === s.uri}
                disabled={busy}
                shake={shakes[s.uri] ?? 0}
                right={
                  <Latency
                    ms={latencies[s.uri]}
                    notResponding={translate('server.not-responding') as string}
                  />
                }
                onPress={() => {
                  if (latencies[s.uri] === null) {
                    setShakes(k => ({ ...k, [s.uri]: (k[s.uri] ?? 0) + 1 }));
                    onUnreachable();
                    return;
                  }
                  if (selectedUri !== s.uri) {
                    onPick(s);
                  }
                }}
              />
            ))}
          </RowCard>
        )}
      </ScrollView>
      {fades}
      <DoneButton
        testID="serverlist.done"
        title={translate('server.done') as string}
        onPress={onBack}
        disabled={busy}
      />
      {placement !== 'belowHeader' && (
        <ScreenHeader
          testID="serverlist.back"
          title={translate('server.other') as string}
          onBack={onBack}
          disabled={busy}
        />
      )}
    </View>
  );
};

export default ServerList;
