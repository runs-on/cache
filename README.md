# Shockingly faster cache action

This action is a drop-in replacement for the official `actions/cache@v4` action, for use with the [RunsOn](https://runs-on.com/?ref=cache) self-hosted GitHub Action runner provider, or with your own self-hosted runner solution.

![image](https://github.com/runs-on/cache/assets/6114/e61c5b6f-aa86-48be-9e1b-baac6dce9b84)

It will automatically store your caches in a dedicated RunsOn S3 bucket that lives close to your self-hosted runners, ensuring you get at least 200MiB/s download and upload throughput when using caches in your workflows. The larger the cache, the faster the speed.

Also note that you no longer have any limit on the size of the cache. The bucket has a lifecycle rule to remove items older than 10 days.

If no S3 bucket is provided, it will also transparently switch to the default behaviour. This means you can use this action and switch between RunsOn runners and official GitHub runners with no change.

## Usage with RunsOn

If using [RunsOn](https://runs-on.com), simply replace `actions/cache@v4` with `runs-on/cache@v4`. All the official options are supported.

```diff
- - uses: actions/cache@v4
+ - uses: runs-on/cache@v4
    with:
      ...
```

Please refer to [actions/cache](https://github.com/actions/cache) for usage.

## Usage outside RunsOn

If you want to use this in your own infrastructure, setup your AWS credentials with [aws-actions/configure-aws-credentials](https://github.com/aws-actions/configure-aws-credentials), then:

```yaml
  - uses: aws-actions/configure-aws-credentials@v4
    ...
  - uses: runs-on/cache@v4
    with:
      ...
    env:
      RUNS_ON_S3_BUCKET_CACHE: name-of-your-bucket
```

Be aware of S3 transfer costs if your runners are not in the same AWS region as your bucket.

## Retry and timeout configuration

All S3 operations (download, upload, cache lookup) include automatic retry with exponential backoff. You can tune this behavior with action inputs:

```yaml
- uses: runs-on/cache@v4
  with:
    path: node_modules
    key: deps-${{ hashFiles('package-lock.json') }}
    retry-max-attempts: 3    # Max retry attempts for S3 operations. 1 = no retry. Default: 3
    timeout-seconds: 300     # Global timeout for entire restore/save operation. 0 = disabled. Default: 300
    s3-max-attempts: 3       # AWS SDK S3Client internal retry count. Default: 3
```

For more advanced tuning, environment variables are available. An env var always takes priority over the corresponding action input.

| Env Var | Default | Description |
|---|---|---|
| `RETRY_MAX_ATTEMPTS` | `3` | Override for `retry-max-attempts` |
| `RETRY_BACKOFF_BASE_MS` | `1000` | Base delay in ms for exponential backoff |
| `RETRY_BACKOFF_MULTIPLIER` | `2` | Backoff multiplier per attempt |
| `RETRY_BACKOFF_MAX_MS` | `30000` | Maximum backoff delay cap in ms |
| `SEGMENT_RETRIES` | `5` | Per-segment download retry count |
| `SEGMENT_TIMEOUT_MS` | `30000` | Per-segment download timeout in ms |
| `GLOBAL_TIMEOUT_SECONDS` | `300` | Override for `timeout-seconds` |
| `S3_MAX_ATTEMPTS` | `3` | Override for `s3-max-attempts` |

## Special environment variables

* `RUNS_ON_S3_BUCKET_CACHE`: if set, the action will use this bucket to store the cache.
* `RUNS_ON_S3_BUCKET_ENDPOINT`: if set, the action will use this endpoint to connect to the bucket. This is useful if you are using AWS's S3 transfer acceleration or a non-AWS S3-compatible service.
* `RUNS_ON_RUNNER_NAME`: when running on RunsOn, where this environment variable is non-empty, existing AWS credentials from the environment will be discarded. If you want to preserve existing environment variables, set this to the empty string `""`.
* `RUNS_ON_S3_FORCE_PATH_STYLE` or `AWS_S3_FORCE_PATH_STYLE`: if one of those environment variables equals the string `"true"`, then the S3 client will be configured to force the path style.


## Action pinning

Contrary to the upstream action, `v4` is a branch. When merging a stable release from upstream (e.g. v4.3.0), I will publish an equivalent tag in this repository. You can either pin to that tag, or a specific commit.
