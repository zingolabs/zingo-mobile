import {
  FORBIDDEN_TERMS,
  isSnapshotRepository,
  snapshotRepositories,
  termHits,
} from '../scripts/repositories_audit.mjs';

describe('term scan', () => {
  // Tests that a grep line is a hit when its content names a forbidden term in any case.
  test('a line naming the host in any case is a hit', () => {
    const lines = [
      'android/app/build.gradle.kts:377:val host = "central.Sonatype.com"',
      'docs/a.md:3:Maven Central serves every release.',
    ];
    expect(termHits(lines, FORBIDDEN_TERMS)).toEqual([lines[0]]);
  });

  // Tests that a path naming a term is no hit when the line's content does not, since git grep matches content alone.
  test('only the content after the path and the line number counts', () => {
    const lines = ['notes/sonatype.md:1:Maven Central serves every release.'];
    expect(termHits(lines, FORBIDDEN_TERMS)).toEqual([]);
  });
});

describe('snapshot repository', () => {
  // Tests that a remote repository is a snapshot repository when its path names snapshots.
  test('a remote url whose path names snapshots is one', () => {
    expect(
      isSnapshotRepository(
        'https://central.example.com/repository/maven-snapshots/',
      ),
    ).toBe(true);
  });

  // Tests that a local repository is no snapshot repository when the checkout's own directory names snapshots.
  test('a local url under a directory naming snapshots is none', () => {
    expect(
      isSnapshotRepository(
        'file:/home/dev/snapshot_audit/node_modules/react-native/android',
      ),
    ).toBe(false);
  });

  // Tests that a remote release repository is no snapshot repository when its path names none.
  test('a remote release url is none', () => {
    expect(isSnapshotRepository('https://repo.maven.apache.org/maven2/')).toBe(
      false,
    );
  });

  // Tests that a listing entry without a url is no snapshot repository when the entry names the Binding Layer repository alone.
  test('an entry naming a repository without a url is none', () => {
    expect(isSnapshotRepository('bindingLayer')).toBe(false);
  });
});

describe('snapshot repositories', () => {
  // Tests that the snapshot repository is reported when the listing holds one among release repositories and other output.
  test('only the snapshot repository lines are reported', () => {
    const listing = [
      'Configuration on demand is an incubating feature.',
      'repository :app https://repo.maven.apache.org/maven2/',
      'repository :app https://central.example.com/repository/maven-snapshots/',
      'repository :app bindingLayer',
      'repository :react-native-fs file:/home/dev/snapshot_audit/node_modules/react-native/android',
      '',
    ].join('\n');
    expect(snapshotRepositories(listing)).toEqual([
      'repository :app https://central.example.com/repository/maven-snapshots/',
    ]);
  });
});
