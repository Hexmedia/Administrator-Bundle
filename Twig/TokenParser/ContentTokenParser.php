<?php

namespace Hexmedia\AdministratorBundle\Twig\TokenParser;

use Hexmedia\AdministratorBundle\Twig\Node\ContentNode;

/**
 * Token Parser for the 'area' tag.
 *
 * @author Krystian Kuczek <krystian@hexmedia.pl>
 */
class ContentTokenParser extends \Twig_TokenParser
{

    /**
     * {@inheritdoc}
     */
    public function parse(\Twig_Token $token)
    {
        $class = null;
        $tag = null;
        $language = null;

        $lineNumber = $token->getLine();
        $stream = $this->parser->getStream();

        $name = $stream->expect(\Twig_Token::STRING_TYPE)->getValue();
        $var = $stream->expect(\Twig_Token::NAME_TYPE)->getValue();
        $field = $stream->expect(\Twig_Token::STRING_TYPE)->getValue();

        if ($stream->test("tag")) {
            $stream->next();
            $stream->expect(\Twig_Token::OPERATOR_TYPE, '=');
            $tag = $this->parser->getExpressionParser()->parseExpression();
        }

        if ($stream->test("class")) {
            $stream->next();
            $stream->expect(\Twig_Token::OPERATOR_TYPE, "=");

            $class = $this->parser->getExpressionParser()->parseExpression();
        }

        if ($stream->test('language')) {
            $stream->next();
            $stream->expect(\Twig_Token::OPERATOR_TYPE, '=');
            $language = $this->parser->getExpressionParser()->parseExpression();
        }

        if (!$stream->test(\Twig_Token::BLOCK_END_TYPE)) {
            throw new \Twig_Error_Syntax('Unexpected token. Twig was looking for the "tag", "class" or "language" keyword.');
        }

        $stream->expect(\Twig_Token::BLOCK_END_TYPE);

        return new ContentNode($name, $var, $field, $tag, $class, $language, $lineNumber, $this->getTag());
    }

    /**
     * {@inheritdoc}
     */
    public function getTag()
    {
        return 'content';
    }

}
