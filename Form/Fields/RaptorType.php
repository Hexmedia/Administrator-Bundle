<?php

namespace Hexmedia\AdministratorBundle\Form\Fields;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\OptionsResolver\OptionsResolverInterface;

/**
 * Class YesNoType
 * @package Hexmedia\AdministratorBundle\Form\Fields
 */
class RaptorType extends AbstractType
{
    public function getParent()
    {
        return "textarea";
    }

    public function getName()
    {
        return "raptor";
    }

}