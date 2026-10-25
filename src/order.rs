pub fn ordered_references(values: &[String]) -> Vec<String> {
    values.to_vec()
}

#[cfg(test)]
mod tests {
    #[test]
    fn empty_input_remains_empty() {
        assert!(super::ordered_references(&[]).is_empty());
    }
}
