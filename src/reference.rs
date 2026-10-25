pub fn normalize_reference(value: &str) -> String {
    value.to_owned()
}

#[cfg(test)]
mod tests {
    #[test]
    fn plain_reference_is_preserved() {
        assert_eq!(super::normalize_reference("A-12"), "A-12");
    }
}
