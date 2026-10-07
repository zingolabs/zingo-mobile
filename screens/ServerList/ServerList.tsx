/* eslint-disable react-native/no-inline-styles */
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { ServerUrisType, TranslateType } from '@app/AppState';
import { LoadingDots } from '@ui/widgets/ProgressState';
import ServerRow, {
  DoneButton,
  Latency,
  RowCard,
  ScreenHeader,
} from '@screens/Server/ServerRow';

type ServerListProps = {
  translate: (key: string) => TranslateType;
  servers: ServerUrisType[];
  loading: boolean;
  latencies: Record<string, number | null>;
  selectedUri: string | null;
  busy: boolean;
  onPick: (server: ServerUrisType) => void;
  onUnreachable: () => void;
  onBack: () => void;
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
  selectedUri,
  busy,
  onPick,
  onUnreachable,
  onBack,
}) => {
  const [shakes, setShakes] = useState<Record<string, number>>({});

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <ScrollView
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: `${BODY_TOP * 100}%`,
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
      <DoneButton
        testID="serverlist.done"
        title={translate('server.done') as string}
        onPress={onBack}
        disabled={busy}
      />
      <ScreenHeader
        testID="serverlist.back"
        title={translate('server.other') as string}
        onBack={onBack}
        disabled={busy}
      />
    </View>
  );
};

export default ServerList;
