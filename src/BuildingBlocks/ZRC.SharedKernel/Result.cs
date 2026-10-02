namespace ZRC.SharedKernel;

public sealed record Error(string Code, string Message)
{
    public static readonly Error None = new(string.Empty, string.Empty);
}

/// <summary>Discriminated result type. No exceptions for control flow.</summary>
public class Result<T>
{
    public bool IsSuccess { get; }
    public bool IsFailure => !IsSuccess;
    public T? Value { get; }
    public Error Error { get; }

    protected Result(bool isSuccess, T? value, Error error)
    {
        IsSuccess = isSuccess;
        Value = value;
        Error = error;
    }

    public static Result<T> Success(T value) => new(true, value, Error.None);
    public static Result<T> Failure(Error error) => new(false, default, error);
    public static Result<T> Failure(string code, string message) => Failure(new Error(code, message));

    public TResult Match<TResult>(Func<T, TResult> onSuccess, Func<Error, TResult> onFailure)
        => IsSuccess ? onSuccess(Value!) : onFailure(Error);
}

public sealed class Result : Result<object?>
{
    private Result(bool isSuccess, object? value, Error error) : base(isSuccess, value, error) { }
    public static Result Success() => new(true, null, Error.None);
    public static new Result Failure(Error error) => new(false, null, error);
    public static new Result Failure(string code, string message) => Failure(new Error(code, message));
}
